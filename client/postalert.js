(function() {
  var boardLinks = {};
  var tabCache = {};
  config.BOARDS.forEach(function(board, index) {
    if (board !== "archive" && board !== "staff") {
      tabCache[board + "threads"] = JSON.parse(
        localStorage.getItem(board + "threads")
      );
      var boardlink = $("#navTop > a:nth-child(" + (index + 1) + ")")[0];
      boardlink.onmouseover = function() {
        boardlink.setAttribute("data-value", "");
      };
      boardLinks[board] = boardlink;
    }
  });

  function getItem(item) {
    var cached;
    if (!tabCache[item]) {
      cached = JSON.parse(localStorage.getItem(item));
      tabCache[item] = cached;
    } else {
      cached = tabCache[item];
    }
    return cached;
  }

  function setItem(item, value) {
    localStorage.setItem(item, JSON.stringify(value));
    tabCache[item] = value;
  }

  function updateInfo(newSum, oldSum, board) {
    var boardlink = boardLinks[board];
    var dataValue = boardlink.getAttribute("data-value");
    if (!dataValue || dataValue === "") dataValue = 0;
    if (!oldSum) {
      dataValue = newSum;
    } else if (newSum > oldSum) {
      dataValue = Number(dataValue) + (newSum - oldSum);
    }
    if (dataValue) boardlink.setAttribute("data-value", dataValue);
  }

  dispatcher[DEF.POST_ALERT_SYNC] = function() {
    if (!options.get("postAlert")) return;
    config.BOARDS.forEach(function(board) {
      if (board !== "archive" && board !== "staff") {
        $.ajax({
          url: config.API_URL + "size/" + board,
          success: function(json) {
            var cached = getItem(board + "threads");
            var threads = {};
            var cumSum = 0;
            var cachedCumSum = 0;
            for (var i = 0; i < json.length; i++) {
              threads[Number(json[i][0].num)] = json[i][0].replies;
              if (THREAD != Number(json[i][0].num))
                cumSum += json[i][0].replies + 1;
            }
            if (cached) {
              var cThreads = Object.keys(cached);
              var jThreads = Object.keys(threads);
              var j = 0;
              for (var k = 0; k < cThreads.length; k++) {
                if (cThreads[k] == jThreads[j]) {
                  if (cThreads[k] != THREAD)
                    cachedCumSum += cached[cThreads[k]] + 1;
                  j++;
                }
              }
              updateInfo(cumSum, cachedCumSum, board);
            } else {
              updateInfo(cumSum, 0, board);
            }
            setItem(board + "threads", threads);
          }
        });
      }
    });
  };

  dispatcher[DEF.POST_ALERT] = function(msg, op) {
    if (!options.get("postAlert")) return;
    var board = msg[0];
    var cached = getItem(board + "threads");
    var newValues = $.extend(true, {}, cached);
    if (!newValues[op]) newValues[op] = 0;
    newValues[op] += 1;
    setItem(board + "threads", newValues);
    if (op !== THREAD) updateInfo(2, 1, board);
  };

})();
