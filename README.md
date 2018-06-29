# Music Streaming Platform - CS 5412: Cloud Computing Project

### Overview
For our final project, we developed a scalable music streaming service (dubbed "Spoofify") that provides users with song recommendations depending on their interactions with the system. The goal of the project was to build a completely scalable system, focused on the CAP Theorem and scaling outward rather than upwards. 

For the music streaming, we actually used Spotify's open source API to supply the data and music; however, it would be easy to extrapolate this into an in-house API if we instead had access to the volume of streamable music that Spotify has.

For a more detailed dive, jump to our [written report](https://github.com/cdsciavolino/cs5412-music-streaming/blob/master/Final-Report-Streaming-Music-System.pdf).

### Team
- Chris Sciavolino ([@cdsciavolino](https://github.com/cdsciavolino)): Frontend UI and architecture
- Ellin Hu ([@elwho](https://github.com/elwho)): Backend and ML model

### Scalable System Architecture
![System Architecture](https://github.com/cdsciavolino/cs5412-music-streaming/blob/master/_readme-assets/architecture-diagram.png "Music Streaming Platform Architecture")

### User Flow
As for the overall experience, the user first logs into (or creates) an account for our streaming service. Then, if it is the user's first time logging into the application, the user is prompted to also log into their Spotify account. Their Spotify information is then saved in an external database so the user doesn't need to log into their Spotify account each time. Finally, the user is directed to the main page where the user can listen to songs and interact with the application.

On this main page, the user is able to listen to music online through clicking on the songs presented. There is a button on the bottom that refreshes the music feed with recommended songs for the user based on their interactions with the app. As of right now, there are 2 interactions recorded: skips and completed plays. In our view, the app should suggest songs similar to songs completed and unlike songs that the user skips.
