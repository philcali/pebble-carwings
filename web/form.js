function() {
  $('button').on('click', function() {
    var config = {
      username: $('#username').val(),
      password: $('#password').val()
    };
    location.href = 'pebblejs://close#' + encodeURIComponent(JSON.stringify(config));
    return false;
  });
});
