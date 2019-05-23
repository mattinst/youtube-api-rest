// var API_KEY = "YOUR_API_KEY";

var CLIENT_ID = "YOUR_CLIENT_ID";
var REDIRECT_URI = "http://localhost:5500";
var RESPONSE_TYPE = "token";
var SCOPES = "https://www.googleapis.com/auth/youtube";
var STATE_PARAM = "mystate";
var playlistId = "YOUR_PLAYLIST_ID";
var AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
var AUTH_URL = `${AUTH_ENDPOINT}?scope=${SCOPES}&state=${STATE_PARAM}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&client_id=${CLIENT_ID}`;

var auth_token = undefined;
var the_state = undefined;

function oauthSignIn() {
  var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

  var form = document.createElement("form");
  form.setAttribute("method", "GET");
  form.setAttribute("action", oauth2Endpoint);

  var params = {
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: RESPONSE_TYPE,
    scope: SCOPES,
    include_granted_scopes: "true",
    state: STATE_PARAM
  };

  for (var p in params) {
    var input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", p);
    input.setAttribute("value", params[p]);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

function queryStringToObj(queryString) {
  // const obj = {};
  // decodeURI(queryString)
  //   .split("&")
  //   .forEach(function(component) {
  //     console.log(component);
  //     var parts = component.split("=");
  //     obj[parts[0]] = parts[1];
  //   });
  // console.log(obj);
  // return obj;
  return decodeURI(queryString)
    .split("&")
    .reduce(function(obj, component) {
      var parts = component.split("=");
      obj[parts[0]] = parts[1];
      return obj;
    }, {});
}

function validateToken(access_token) {
  if (access_token) {
    // return fetch(
    //   `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`
    // )
    //   .then(function(response) {
    //     if (response.ok) {
    //       return response.json();
    //     } else {
    //       throw new Error(response.status);
    //     }
    //   })
    //   .then(function(json) {
    //     var { aud } = json;
    //     if (aud !== CLIENT_ID) {
    //       throw new Error("aud error");
    //     }
    //     return json;
    //   });
    return $.ajax(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`
    ).then(function(response) {
      var { aud } = response;
      if (aud !== CLIENT_ID) {
        throw new Error("aud error");
      }
      return response;
    });
  }
}

function youtubeRequest(cb) {
  if (the_state === STATE_PARAM) {
    // check if the token is expired
    var { exp, date } = JSON.parse(sessionStorage.getItem("token_expiration"));
    var currentDate = Date.now();
    (currentDate - date) / 1000 > exp ? cb("token expired") : cb();
  } else {
    cb("invalid state");
  }
}

function addVideoToPlaylist(videoId, playlistId) {
  // return fetch(
  //   `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`,
  //   // `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${API_KEY}`,
  //   {
  //     method: "POST",
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //       Accept: "application/json",
  //       "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify({
  //       snippet: {
  //         playlistId: playlistId,
  //         position: 0,
  //         resourceId: {
  //           kind: "youtube#video",
  //           videoId: videoId
  //         }
  //       }
  //     })
  //   }
  // );

  return $.ajax(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`,
    // `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth_token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      data: JSON.stringify({
        snippet: {
          playlistId: playlistId,
          position: 0,
          resourceId: {
            kind: "youtube#video",
            videoId: videoId
          }
        }
      })
    }
  );
}

$(function() {
  $("#sign-in-or-out-button").on("click", function() {
    oauthSignIn();
  });

  $("#add-playlist-button").click(function() {
    var videoId = $("#video-id")
      .val()
      .trim();

    youtubeRequest(function(error) {
      if (error) {
        return console.log(error);
      }

      addVideoToPlaylist(videoId, playlistId)
        .then(function(response) {
          console.log("Video Added Response", response);
        })
        .catch(function(err) {
          console.error("Execute error", err);
        });
    });
  });

  var queryString = location.hash.substring(1);
  if (queryString) {
    var { access_token, state } = queryStringToObj(queryString);
    validateToken(access_token)
      .then(function(tokenInfo) {
        auth_token = access_token;
        the_state = state;
        sessionStorage.setItem(
          "token_expiration",
          JSON.stringify({
            exp: tokenInfo.expires_in,
            date: Date.now()
          })
        );
      })
      .catch(function(error) {
        console.log(`${error.status} Error`);
        console.log(error);
        auth_token = "";
        the_state = "";
      });
  }
});
