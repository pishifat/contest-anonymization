# contest anonymization

anonymize mapping contest entries

used for https://osu.ppy.sh/wiki/en/Contests/Monthly_Beatmapping_Contest

## setup

- "contest-id.zip"
    - Username (osu ID)
        - Artist - Title.osz
    - Username (osu ID)
        - Artist - Title.osz
    - Username (osu ID)
        - Artist - Title.osz

## use

put contest zip into directory with above setup

edit `variables.json` with relevant content

- id: the id in contest zip file
- name: used in anonymized .osz files
- taiko: anonymizes extra things
    - stack leniency
    - circle size
    - approach rate
    - hitobject coordinates