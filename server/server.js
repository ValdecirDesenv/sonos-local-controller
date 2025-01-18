const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const corsOptions = {
    origin: 'http://localhost:5173',
};
app.use(cors(corsOptions));


app.get('/api', (req, res) => {
    res.json(
{
   0:{"uuid":"RINCON_38420B885C7001400","coordinator":{"uuid":"RINCON_38420B885C7001400","state":{"volume":38,"mute":false,"equalizer":{"bass":0,"treble":0,"loudness":false},"currentTrack":{"artist":"","title":"","album":"","albumArtUri":"","duration":0,"uri":"","trackUri":"","type":"track","stationName":""},"nextTrack":{"artist":"","title":"","album":"","albumArtUri":"","duration":0,"uri":""},"trackNo":0,"elapsedTime":0,"elapsedTimeFormatted":"00:00:00","playbackState":"STOPPED","playMode":{"repeat":"none","shuffle":false,"crossfade":false}},"roomName":"OA-Gym","coordinator":"RINCON_38420B885C7001400","groupState":{"volume":38,"mute":false}},"members":[{"uuid":"RINCON_38420B885C7001400","state":{"volume":38,"mute":false,"equalizer":{"bass":0,"treble":0,"loudness":false},"currentTrack":{"artist":"","title":"","album":"","albumArtUri":"","duration":0,"uri":"","trackUri":"","type":"track","stationName":""},"nextTrack":{"artist":"","title":"","album":"","albumArtUri":"","duration":0,"uri":""},"trackNo":0,"elapsedTime":0,"elapsedTimeFormatted":"00:00:00","playbackState":"STOPPED","playMode":{"repeat":"none","shuffle":false,"crossfade":false}},"roomName":"OA-Gym","coordinator":"RINCON_38420B885C7001400","groupState":{"volume":38,"mute":false}}]}}
    )
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});