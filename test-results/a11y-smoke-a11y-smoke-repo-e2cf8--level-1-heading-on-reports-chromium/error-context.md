# Page snapshot

```yaml
- link "Hopp til hovedinnhold":
    - /url: '#main-content'
- main:
    - navigation "Breadcrumb":
        - list:
            - listitem:
                - link "Hjem":
                    - /url: /
            - listitem:
                - link "Innstillinger":
                    - /url: /settings
            - listitem: Dataeksport
    - heading "Dataeksport" [level=1]
    - paragraph:
        Eksporter alle data for sikkerhetskopi eller ekstern analyse. Eksport kjøres lokalt i
        nettleseren.
    - text: Datoområde
    - combobox: Hele perioden
    - checkbox "Anonymiser personopplysninger"
    - text: Anonymiser personopplysninger
    - checkbox "Bruk datoområde også for sikkerhetskopi"
    - text: Bruk datoområde også for sikkerhetskopi
    - status: Eksporterer alle data
    - button "Eksporter alt som CSV":
        - img
        - text: Eksporter alt som CSV
    - button "Eksporter alt som JSON":
        - img
        - text: Eksporter alt som JSON
    - button "Opprett full sikkerhetskopi":
        - img
        - text: Opprett full sikkerhetskopi
    - text: Elev
    - combobox "Elev": Velg en elev
    - button "Eksporter analyse-PDF" [disabled]
    - paragraph: Åpner Analyse for denne eleven og datoperioden for å eksportere PDF med grafer.
    - paragraph: Store eksporter kan ta noen sekunder. Ikke lukk fanen.
```
