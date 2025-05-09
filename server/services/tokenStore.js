let token = null;

function setToken(newtoken) {
  token = newtoken;
}

function getToken() {
  return token;
}

module.exports = { setToken, getToken };
