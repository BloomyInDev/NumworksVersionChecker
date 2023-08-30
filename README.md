# NumworksVersionChecker

An Node.js program that download and notifies when an new version of Epsilon come out

# What this does

This program will check everyday at 00:00 (its use an cron task) if a new version of Epsilon is available to the public

This will also download it and notify you if you have setup the Discord Webhook

An simplist page is also implemented to see and download all the files

# How to setup

<details>
    <summary>Via NodeJs</summary>
    Clone this repository, install all the dependencies and launch the program with

    npm install
    npm start

</details>
<details>
    <summary>Via Docker Compose</summary>
    Here is the docker-compose file

    version: '3'
    services:
      numworksversionchecker:
        image: bloomyindev/numworksversionchecker:v1-release
        ports:
        - "8080:3000"
        volumes:
        - /home/bastien/docker/numvercheck:/app/static

</details>

## Issues and problems

If you have any issue with my script, open an issue please (cuz i'm gonna try to fix it)

NumWorks is a registered trademark of NumWorks SAS, 24 Rue Godot de Mauroy, 75009 Paris, France.
NumWorks SAS isn't associated in any shape or form with this project.
