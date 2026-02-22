/**
 * Potential secret detection utility for AI-bound inputs.
 *
 * Scans text for common API key/token formats before sending content
 * to an external model.
 */

export interface SecretDetectionResult {
    hasPotentialSecrets: boolean;
    matchedPatternIds: string[];
}

interface SecretPatternDefinition {
    id: string;
    source: string;
    flags?: string;
}

interface SecretPattern {
    id: string;
    regex: RegExp;
}

const SECRET_PATTERN_DEFINITIONS: readonly SecretPatternDefinition[] = [
    // AI / LLM
    { id: 'anthropic_api_key', source: String.raw`\bsk-ant-[A-Za-z0-9-]{10,}\b` },
    { id: 'openai_project_api_key', source: String.raw`\bsk-proj-[A-Za-z0-9]{20,}\b` },
    { id: 'openai_admin_api_key', source: String.raw`\bsk-admin-[A-Za-z0-9]{20,}\b` },
    { id: 'openai_service_account_key', source: String.raw`\bsk-svcacct-[A-Za-z0-9]{20,}\b` },
    { id: 'openai_org_key', source: String.raw`\bsk-or-[A-Za-z0-9]{20,}\b` },
    {
        id: 'legacy_openai_api_key',
        source: String.raw`\bsk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]*\b`,
    },
    { id: 'huggingface_token', source: String.raw`\bhf_[A-Za-z]{34}\b` },
    { id: 'replicate_token', source: String.raw`\br8_[A-Za-z0-9]{40}\b` },
    { id: 'perplexity_api_key', source: String.raw`\bpplx-[a-z0-9]{48}\b` },
    { id: 'cohere_api_key', source: String.raw`\bco-[A-Za-z0-9]{40}\b` },
    { id: 'groq_api_key', source: String.raw`\bgsk_[A-Za-z0-9]{48}\b` },
    { id: 'fireworks_api_key', source: String.raw`\bfw_[A-Za-z0-9]{32}\b` },
    { id: 'pinecone_api_key', source: String.raw`\bpcsk_[A-Za-z0-9]{40}\b` },
    { id: 'xai_api_key', source: String.raw`\bxai-[A-Za-z0-9]{40}\b` },
    { id: 'mistral_api_key', source: String.raw`\bmist-[A-Za-z0-9]{32}\b` },
    { id: 'deepseek_api_key', source: String.raw`\bsk-ds-[A-Za-z0-9]{20,}\b` },

    // Cloud providers
    { id: 'aws_access_key_id', source: String.raw`\bAKIA[0-9A-Z]{16}\b` },
    { id: 'aws_session_key_id', source: String.raw`\bASIA[0-9A-Z]{16}\b` },
    {
        id: 'aws_secret_access_key_reference',
        source: String.raw`AWS_SECRET_ACCESS_KEY\s*[=:]`,
        flags: 'i',
    },
    { id: 'google_api_key', source: String.raw`\bAIza[0-9A-Za-z_-]{35}\b` },
    { id: 'google_oauth_token', source: String.raw`\bya29\.[0-9A-Za-z_-]+\b` },
    { id: 'google_oauth_client_secret', source: String.raw`\bGOCSPX-[A-Za-z0-9_-]{28}\b` },
    { id: 'azure_storage_account_key', source: String.raw`AccountKey=[A-Za-z0-9+/=]{80,}` },
    {
        id: 'azure_storage_connection_string',
        source: String.raw`DefaultEndpointsProtocol=https;AccountName=`,
    },
    { id: 'oci_identifier', source: String.raw`\bocid1\.[a-z]+\.oc1\.\.[a-z0-9]{30,}\b` },

    // Git hosting
    { id: 'github_personal_access_token', source: String.raw`\bghp_[0-9A-Za-z]{36}\b` },
    { id: 'github_fine_grained_pat', source: String.raw`\bgithub_pat_[0-9A-Za-z_]{82}\b` },
    { id: 'github_oauth_token', source: String.raw`\bgho_[0-9A-Za-z]{36}\b` },
    { id: 'github_server_token', source: String.raw`\bghs_[0-9A-Za-z]{36}\b` },
    { id: 'github_user_token', source: String.raw`\bghu_[0-9A-Za-z]{36}\b` },
    { id: 'gitlab_pat', source: String.raw`\bglpat-[0-9A-Za-z_-]{20}\b` },
    { id: 'gitlab_runner_token', source: String.raw`\bglrt-[0-9A-Za-z_-]{20}\b` },

    // CI/CD and package ecosystems
    { id: 'circleci_token', source: String.raw`\bcircle-[a-f0-9]{40}\b` },
    { id: 'mongodb_atlas_token', source: String.raw`\batlasv1\.[A-Za-z0-9_-]{60}\b` },
    { id: 'pulumi_token', source: String.raw`\bpul-[a-f0-9]{40}\b` },
    { id: 'npm_token', source: String.raw`\bnpm_[A-Za-z0-9]{36}\b` },
    { id: 'pypi_token', source: String.raw`\bpypi-[A-Za-z0-9]{100}\b` },
    { id: 'rubygems_token', source: String.raw`\brubygems_[a-f0-9]{48}\b` },
    { id: 'docker_pat', source: String.raw`\bdckr_pat_[A-Za-z0-9_-]{27}\b` },

    // Hosting / CDN
    { id: 'netlify_personal_token', source: String.raw`\bnfp_[A-Za-z0-9]{40}\b` },
    { id: 'netlify_team_token', source: String.raw`\bnft_[A-Za-z0-9]{40}\b` },
    { id: 'flyio_token', source: String.raw`\bfo1_[A-Za-z0-9]{40}\b` },
    { id: 'render_token', source: String.raw`\brnd_[A-Za-z0-9]{32}\b` },

    // Payments
    { id: 'stripe_live_secret_key', source: String.raw`\bsk_live_[0-9A-Za-z]{24}\b` },
    { id: 'stripe_test_secret_key', source: String.raw`\bsk_test_[0-9A-Za-z]{24}\b` },
    { id: 'stripe_live_restricted_key', source: String.raw`\brk_live_[0-9A-Za-z]{24}\b` },
    { id: 'stripe_webhook_secret', source: String.raw`\bwhsec_[0-9A-Za-z]{32}\b` },
    { id: 'stripe_live_publishable_key', source: String.raw`\bpk_live_[0-9A-Za-z]{24}\b` },
    { id: 'square_access_token', source: String.raw`\bsq0atp-[0-9A-Za-z_-]{22}\b` },
    { id: 'square_secret', source: String.raw`\bsq0csp-[0-9A-Za-z_-]{43}\b` },
    {
        id: 'paypal_access_token',
        source: String.raw`\baccess-(?:sandbox|development|production)-[a-f0-9-]{36}\b`,
    },

    // Communication
    { id: 'slack_bot_token', source: String.raw`\bxoxb-[0-9A-Za-z-]{10,}\b` },
    { id: 'slack_user_token', source: String.raw`\bxoxp-[0-9A-Za-z-]{10,}\b` },
    { id: 'slack_workspace_token', source: String.raw`\bxoxs-[0-9A-Za-z-]{10,}\b` },
    { id: 'slack_app_token', source: String.raw`\bxapp-[0-9A-Za-z-]{10,}\b` },
    {
        id: 'slack_webhook_url',
        source: String.raw`hooks\.slack\.com/services/T[A-Za-z0-9]+/B[A-Za-z0-9]+/[A-Za-z0-9]+`,
    },

    // Email / messaging providers
    {
        id: 'sendgrid_api_key',
        source: String.raw`\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b`,
    },
    { id: 'resend_api_key', source: String.raw`\bre_[A-Za-z0-9]{30}\b` },
    { id: 'sendinblue_api_key', source: String.raw`\bxkeysib-[a-f0-9]{64}\b` },
    { id: 'mailchimp_api_key', source: String.raw`\b[a-f0-9]{32}-us[0-9]{1,2}\b` },
    { id: 'sendinblue_legacy_key', source: String.raw`\bSK[0-9a-fA-F]{32}\b` },
    { id: 'twilio_account_sid', source: String.raw`\bAC[0-9a-fA-F]{32}\b` },

    // Database / BaaS
    { id: 'supabase_service_key', source: String.raw`\bsbp_[a-f0-9]{40}\b` },
    { id: 'planetscale_token', source: String.raw`\bpscale_tkn_[A-Za-z0-9_-]{43}\b` },
    { id: 'planetscale_password', source: String.raw`\bpscale_pw_[A-Za-z0-9_-]{43}\b` },
    { id: 'planetscale_oauth', source: String.raw`\bpscale_oauth_[A-Za-z0-9_-]{43}\b` },
    { id: 'databricks_token', source: String.raw`\bdbi_[a-f0-9]{40}\b` },

    // Monitoring / analytics
    { id: 'newrelic_api_key', source: String.raw`\bNRAK-[A-Z0-9]{27}\b` },
    { id: 'sentry_auth_token', source: String.raw`\bsntrys_[A-Za-z0-9]{64}\b` },
    { id: 'grafana_service_account', source: String.raw`\bglsa_[A-Za-z0-9]{32}\b` },
    { id: 'grafana_cloud_token', source: String.raw`\bglc_[A-Za-z0-9]{44}\b` },
    { id: 'linode_api_token', source: String.raw`\blin_api_[A-Za-z0-9]{40}\b` },
    { id: 'atlassian_api_token', source: String.raw`\bxaat-[a-f0-9]{8}-[A-Za-z0-9-]+\b` },

    // SaaS
    { id: 'notion_secret', source: String.raw`\bsecret_[A-Za-z0-9]{43}\b` },
    { id: 'notion_token', source: String.raw`\bntn_[A-Za-z0-9]{50}\b` },
    { id: 'postman_api_key', source: String.raw`\bPMAK-[a-f0-9]{24}-[A-Za-z0-9]+\b` },
    { id: 'facebook_access_token', source: String.raw`\bEAAx[0-9A-Za-z]{20,}\b` },
    { id: 'cloudflare_api_token', source: String.raw`\bCFPAT-[A-Za-z0-9_-]{43}\b` },
    { id: 'shopify_admin_token', source: String.raw`\bshpat_[a-fA-F0-9]{32}\b` },
    { id: 'shopify_private_app_password', source: String.raw`\bshppa_[a-fA-F0-9]{32}\b` },
    { id: 'vault_token', source: String.raw`\bvlt_[A-Za-z0-9]{40}\b` },

    // Keys / certs
    {
        id: 'private_key_block',
        source: String.raw`-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----`,
    },
    { id: 'pgp_private_key_block', source: String.raw`-----BEGIN PGP PRIVATE KEY BLOCK-----` },

    // JWT / credentials in URLs
    {
        id: 'jwt_token',
        source: String.raw`\beyJhbGciOiJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b`,
    },
    {
        id: 'mongodb_connection_string_with_password',
        source: String.raw`mongodb(?:\+srv)?:\/\/[^:\s]+:[^@\s]+@`,
    },
    {
        id: 'postgres_connection_string_with_password',
        source: String.raw`postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@`,
    },
    { id: 'mysql_connection_string_with_password', source: String.raw`mysql:\/\/[^:\s]+:[^@\s]+@` },
    { id: 'redis_connection_string_with_password', source: String.raw`rediss?:\/\/:[^@\s]+@` },
    {
        id: 'neon_connection_string_with_password',
        source: String.raw`postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@.*neon\.tech`,
    },
    {
        id: 'turso_connection_string',
        source: String.raw`libsql:\/\/[^\s]+`,
    },

    // Context-based indicators (variable names + assignment)
    {
        id: 'cloudflare_env_secret_reference',
        source: String.raw`(?:CLOUDFLARE|CF)_(?:API_KEY|API_TOKEN|DNS_API_TOKEN)\s*[=:]`,
        flags: 'i',
    },
    { id: 'vercel_token_reference', source: String.raw`VERCEL_TOKEN\s*[=:]`, flags: 'i' },
    { id: 'fastly_token_reference', source: String.raw`FASTLY_API_TOKEN\s*[=:]`, flags: 'i' },
    { id: 'datadog_key_reference', source: String.raw`DD_(?:API|APP)_KEY\s*[=:]`, flags: 'i' },
    { id: 'sentry_dsn_reference', source: String.raw`SENTRY_DSN\s*[=:].*https://`, flags: 'i' },
    {
        id: 'auth0_client_secret_reference',
        source: String.raw`AUTH0_CLIENT_SECRET\s*[=:]`,
        flags: 'i',
    },
    { id: 'clerk_secret_key_reference', source: String.raw`CLERK_SECRET_KEY\s*[=:]`, flags: 'i' },
    { id: 'okta_secret_reference', source: String.raw`OKTA_.*(?:TOKEN|SECRET)\s*[=:]`, flags: 'i' },
    {
        id: 'line_secret_reference',
        source: String.raw`LINE_CHANNEL_(?:SECRET|ACCESS_TOKEN)\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'firebase_secret_reference',
        source: String.raw`FIREBASE_.*(?:KEY|TOKEN|SECRET)\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'shopify_secret_reference',
        source: String.raw`SHOPIFY_.*(?:TOKEN|KEY|SECRET)\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'postmark_token_reference',
        source: String.raw`POSTMARK_(?:SERVER|ACCOUNT)_TOKEN\s*[=:]`,
        flags: 'i',
    },
    { id: 'vonage_secret_reference', source: String.raw`VONAGE_API_SECRET\s*[=:]`, flags: 'i' },
    { id: 'twilio_auth_token_reference', source: String.raw`TWILIO_AUTH_TOKEN\s*[=:]`, flags: 'i' },
    {
        id: 'pagerduty_token_reference',
        source: String.raw`PAGERDUTY_(?:API_KEY|TOKEN)\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'upstash_token_reference',
        source: String.raw`UPSTASH_REDIS_REST_TOKEN\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'algolia_key_reference',
        source: String.raw`ALGOLIA_(?:ADMIN|SEARCH)_(?:API_)?KEY\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'azure_client_secret_reference',
        source: String.raw`AZURE_CLIENT_SECRET\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'paypay_secret_reference',
        source: String.raw`PAYPAY_.*(?:SECRET|KEY)\s*[=:]`,
        flags: 'i',
    },
    {
        id: 'public_env_secret_reference',
        source: String.raw`(?:VITE|NEXT_PUBLIC|REACT_APP|NUXT_PUBLIC|EXPO_PUBLIC|GATSBY)_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\s*=`,
        flags: 'i',
    },
    {
        id: 'gcp_service_account_reference',
        source: String.raw`GCP_SERVICE_ACCOUNT\s*[=:]`,
        flags: 'i',
    },
    { id: 'service_account_json_type', source: String.raw`"type"\s*:\s*"service_account"`, flags: 'i' },

    // Additional context-based references for modern services
    { id: 'nextauth_secret_reference', source: String.raw`NEXTAUTH_SECRET\s*[=:]`, flags: 'i' },
    {
        id: 'database_url_reference',
        source: String.raw`(?:DATABASE_URL|PRISMA_DATABASE_URL|TURSO_CONNECTION_URL)\s*[=:]`,
        flags: 'i',
    },
    { id: 'langchain_api_key_reference', source: String.raw`LANGCHAIN_API_KEY\s*[=:]`, flags: 'i' },
    {
        id: 'supabase_key_reference',
        source: String.raw`SUPABASE_(?:SERVICE_ROLE_KEY|ANON_KEY)\s*[=:]`,
        flags: 'i',
    },
    { id: 'openai_api_key_reference', source: String.raw`OPENAI_API_KEY\s*[=:]`, flags: 'i' },
    {
        id: 'anthropic_api_key_reference',
        source: String.raw`ANTHROPIC_API_KEY\s*[=:]`,
        flags: 'i',
    },
];

const SECRET_PATTERNS: readonly SecretPattern[] = SECRET_PATTERN_DEFINITIONS.map((definition) => ({
    id: definition.id,
    regex: new RegExp(definition.source, definition.flags ?? ''),
}));

const DEFAULT_MAX_MATCHES = 5;

/**
 * Detect potential secrets in a text blob.
 *
 * @param text - Input text to inspect
 * @param maxMatches - Maximum number of matched pattern IDs to return
 * @returns Detection result with matched pattern IDs
 */
export function detectPotentialSecrets(
    text: string,
    maxMatches = DEFAULT_MAX_MATCHES,
): SecretDetectionResult {
    if (!text || maxMatches <= 0) {
        return { hasPotentialSecrets: false, matchedPatternIds: [] };
    }

    const matchedPatternIds: string[] = [];

    for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(text)) {
            matchedPatternIds.push(pattern.id);

            if (matchedPatternIds.length >= maxMatches) {
                break;
            }
        }
    }

    return {
        hasPotentialSecrets: matchedPatternIds.length > 0,
        matchedPatternIds,
    };
}
