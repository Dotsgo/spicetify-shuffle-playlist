/*
 * Spicetify Shuffle Playlist
 *
 * MIT License
 *
 * Copyright (c) 2024 Gomeschian
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function shufflePlaylist() {
  const {
    CosmosAsync,

    URI,
  } = Spicetify;
  if (!(CosmosAsync && URI)) {
    setTimeout(shufflePlaylist, 300);
    return;
  }

  const API_DELAY = 1000; // Artificial delay in milliseconds between API calls

  const buttontxt = "Shuffle Playlist";

  async function backupAndShufflePlaylist(uris) {
    // Definitions

    const fisherYatesShuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
      return array;
    };

    const createBackupPlaylist = async (
      originalPlaylistId,
      originalTrackURIs
    ) => {
      try {
        // Get the name of the original playlist
        const originalPlaylistName = await getPlaylistName(originalPlaylistId);

        // Create a new playlist name for the backup
        const now = new Date();
        const backupPlaylistName = `${originalPlaylistName} (Backup ${now.toLocaleString()})`;

        // Create a new playlist for backup
        const backupPlaylistId = await createEmptyPlaylist(backupPlaylistName);

        // Copy all tracks from the original playlist to the backup playlist
        await updatePlaylistTracks(backupPlaylistId, originalTrackURIs);

        return backupPlaylistId;
      } catch (error) {
        console.error("Error creating backup playlist:", error);
        throw error;
      }
    };

    const unFollowBackupPlaylist = async (backupPlaylistId) => {
      console.log("Unfollowing backup playlist:", backupPlaylistId);
      const requestURL = `https://api.spotify.com/v1/playlists/${backupPlaylistId}/followers`;

      return await CosmosAsync.del(requestURL);
    };

    const updatePlaylist = async (playlistId, trackUris) => {
      try {
        const chunkSize = 100;

        // Replace the first chunk
        const firstChunk = trackUris.splice(0, chunkSize);
        await replacePlaylistTracks(playlistId, firstChunk);

        // If there are additional chunks, add them to the playlist
        while (trackUris.length > 0) {
          // Add rate-limiting delay
          await new Promise((resolve) => setTimeout(resolve, API_DELAY));
          const additionalChunk = tracks.splice(0, chunkSize);
          await addTracksToPlaylist(playlistId, additionalChunk);
        }
      } catch (error) {
        console.error("Error updating playlist:", error);
        throw error;
      }
    };

    const replacePlaylistTracks = async (playlistId, trackURIs) => {
      const requestURL = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
      const requestBody = {
        uris: trackURIs.map((uri) => `spotify:track:${uri}`),
      };
      console.log("track URIs:", trackURIs);
      console.log("Request body:", requestBody);
      const response = await CosmosAsync.put(requestURL, requestBody);
      console.log("response", response);
      if (!response.snapshot_id) {
        console.error("Error replacing playlist tracks");
        throw new Error(`Failed to replace playlist tracks.`);
      }
    };

    const addTracksToPlaylist = async (playlistId, trackURIs) => {
      const requestURL = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
      const requestBody = JSON.stringify({
        uris: trackURIs.map((URI) => `spotify:track:${URI}`),
      });
      const response = await CosmosAsync.post(requestURL, requestBody);

      if (!response.snapshot_id) {
        console.error("Error adding tracks to playlist");
        throw new Error(`Failed to add tracks to playlist.`);
      }
    };

    const fetchPlaylistData = async (playlistId) => {
      const response = await CosmosAsync.get(
        `sp://core-playlist/v1/playlist/spotify:playlist:${playlistID}/rows`
      );

      if (!response.rows) {
        console.log("Failed to fetch playlist data.");
        throw new Error("Failed to fetch playlist data.");
      }

      const playlistData = response;
      return playlistData;
    };

    const getAllPlaylistTracks = (playlistData) => {
      const allTrackUris = playlistData.rows
        .map((track) => track.link)
        .map((uri) => uri.split(":")[2]);
      console.log("Fetched tracks:", allTrackUris.length);
      console.log("All tracks fetched:", allTrackUris);

      return allTrackUris;
    };
    async function createEmptyPlaylist(
      newPlaylistName = "Spicetify Shuffle Backup"
    ) {
      const response = await CosmosAsync.post(
        "https://api.spotify.com/v1/me/playlists",
        {
          name: newPlaylistName,
          public: true,
          description: "Created with Spicetify Playlist Shuffler",
        }
      );
      if (!response.id) {
        throw new Error("Failed to create empty playlist");
      }
      console.log("Playlist created:", response);
      const newPlaylistID = response.id;
      return newPlaylistID;
    }

    const updatePlaylistTracks = async (playlistId, trackURIs = []) => {
      const requestURL = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

      const batchSize = 100;

      while (trackURIs.length > 0) {
        const batch = trackURIs.splice(0, batchSize);

        const requestBody = {
          uris: batch.map((uri) => `spotify:track:${uri}`),
        };
        console.log(requestBody);
        const response = await CosmosAsync.put(
          requestURL,
          JSON.stringify(requestBody)
        );

        if (!response.snapshot_id) {
          console.error("Error updating playlist tracks");
          throw new Error(`Failed to update playlist tracks.`);
        }
      }
    };

    const getPlaylistName = async (playlistId) => {
      const response = await CosmosAsync.get(
        `https://api.spotify.com/v1/playlists/${playlistId}`
      );

      console.log("Playlist name response:", response);

      if (!response.name) {
        console.error("Error fetching playlist name");
        throw new Error(`Failed to fetch playlist name.`);
      }

      const playlistName = response.name;
      return playlistName;
    };

    // Execution

    const playlistID = uris[0].split(":")[2];
    console.log("Playlist ID:", playlistID);

    Spicetify.showNotification(
      "Backing up and shuffling playlist (may take a minute)..."
    );

    await new Promise((resolve) => setTimeout(resolve, API_DELAY));

    try {
      const playlistData = await fetchPlaylistData(playlistID);

      const originalTrackURIs = getAllPlaylistTracks(playlistData);

      // Create a backup playlist
      const backupPlaylistID = await createBackupPlaylist(
        playlistID,
        originalTrackURIs
      );

      // Shuffle the tracks
      const shuffledTrackUris = fisherYatesShuffle(originalTrackURIs);

      // Update the original playlist with the shuffled tracks
      await updatePlaylist(playlistID, shuffledTrackUris);

      Spicetify.showNotification(
        "Playlist shuffled successfully! May need to refresh/reload your playlist."
      );

      // Optionally delete the backup playlist automatically
      // await unFollowBackupPlaylist(backupPlaylistID);
    } catch (error) {
      console.error("Error shuffling playlist:", error);
      Spicetify.showNotification(
        "Something went wrong shuffling playlist. Please try again."
      );
    }
  }

  function shouldDisplayContextMenu(uris) {
    if (uris.length > 1) {
      return false;
    }

    const uri = uris[0];
    const uriObj = Spicetify.URI.fromString(uri);

    if (uriObj.type === Spicetify.URI.Type.PLAYLIST_V2) {
      return true;
    }

    return false;
  }

  const cntxMenu = new Spicetify.ContextMenu.Item(
    buttontxt,
    backupAndShufflePlaylist,
    shouldDisplayContextMenu
  );

  cntxMenu.register();
})();
