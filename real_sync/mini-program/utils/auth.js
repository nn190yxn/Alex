function getToken() {
  return wx.getStorageSync('token') || wx.getStorageSync('jwt_token') || '';
}

function setToken(token) {
  if (token) {
    wx.setStorageSync('token', token);
    wx.setStorageSync('jwt_token', token);
  }
}

function getUserInfo() {
  return wx.getStorageSync('userInfo') || wx.getStorageSync('user_info') || null;
}

function setUserInfo(userInfo) {
  wx.setStorageSync('userInfo', userInfo || null);
  wx.setStorageSync('user_info', userInfo || null);
}

function clearAuth() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('jwt_token');
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('user_info');
}

function isTokenExpired(bufferSeconds) {
  return false;
}

function redirectToLogin() {
  clearAuth();
  wx.redirectTo({ url: '/pages/login/login' });
}

module.exports = {
  getToken,
  setToken,
  getUserInfo,
  setUserInfo,
  clearAuth,
  isTokenExpired,
  redirectToLogin,
};
