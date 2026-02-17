import { PromptType } from '../types/enums/PromptType';

export const getHungarianPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Tapasztalt szoftvermérnökként nyújtson magas szintű útmutatást a kódváltoztatásokhoz.
Visszajelzésének a következő jellemzőkkel kell rendelkeznie:

- Fókusz az architekturális és tervezési következményekre
- Fejlesztési javaslatok konkrét implementációk helyett
- Karbantarthatóság és skálázhatóság figyelembevétele
`,
        commit: `
Elemezze a megadott változtatásokat és javasoljon kulcspontokat a commit üzenethez.
Vegye figyelembe:

Stílus kontextus:
- normal: Professzionális technikai áttekintés
- emoji: Barátságos útmutatás
- kawaii: Közvetlen visszajelzés

Áttekintendő változtatások:
{{diff}}
`,
        prTitle: `
Elemezze a következő változtatásokat és javasoljon fontos pontokat a PR címéhez.
Vegye figyelembe:

- Mi a fő hatása ezeknek a változtatásoknak?
- Melyik terület a legérintettebb?
- Milyen típusú változtatás ez? (funkció, javítás, fejlesztés)

Áttekintendő változtatások:
{{diff}}
`,
        prBody: `
Tekintse át ezeket a változtatásokat és nyújtson útmutatást a Pull Request leírásához.
Vegye figyelembe ezeket a szempontokat:

# Stratégiai áttekintés
- Milyen problémát old meg?
- Miért ezt a megközelítést választottuk?
- Mik a kulcsfontosságú technikai döntések?

# Áttekintési pontok
- Mely területek igényelnek különös figyelmet?
- Mik a potenciális kockázatok?
- Milyen teljesítménybeli megfontolások vannak?

# Implementáció áttekintése
- Mik a fő változtatások?
- Hogyan hat ez a rendszerre?
- Milyen függőségeket kell figyelembe venni?

# Áttekintési követelmények
- Mit kell tesztelni?
- Milyen telepítési megfontolások vannak?
- Milyen dokumentáció szükséges?

Áttekintendő változtatások:
{{diff}}
`,
        'issue.task': `
Elemezze a feladatot és javasoljon figyelembe veendő kulcspontokat:

### Cél
- Milyen problémát kell megoldani?
- Miért fontos ez most?

### Implementációs útmutató
- Mely területeket kell figyelembe venni?
- Milyen megközelítések lehetségesek?

### Sikerkritériumok
- Hogyan ellenőrizhető a befejezés?
- Mik a minőségi követelmények?

### Stratégiai megfontolások
- Mi lehet érintett?
- Milyen függőségeket kell figyelembe venni?
- Mi a prioritási szint?
- Mi az észszerű időkeret?

### Tervezési megjegyzések
- Milyen erőforrásokra van szükség?
- Milyen kockázatokat kell figyelembe venni?
`,
        'issue.standard': `
Elemezze ezt a problémát és nyújtson útmutatást a kulcspontokhoz.
Vegye figyelembe:

### Probléma elemzés
- Mi az alapvető probléma?
- Milyen kontextus fontos?

### Technikai áttekintés
- A rendszer mely részei érintettek?
- Milyen megközelítéseket kell figyelembe venni?
- Mik a lehetséges megoldások?

### Implementációs útmutató
- Milyen lépések szükségesek?
- Mit kell tesztelni?
- Mik a technikai korlátok?

### Hatáselemzés
- Mely területek lesznek érintettek?
- Milyen mellékhatásokat kell figyelembe venni?
- Milyen óvintézkedések szükségesek?

### Áttekintési követelmények
- Milyen dokumentáció szükséges?
- Mit kell tesztelni?
- Vannak-e töréspontok?
`,
    };

    return prompts[type] || '';
};
