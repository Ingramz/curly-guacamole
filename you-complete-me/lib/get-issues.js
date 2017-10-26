(function() {
  var command, convertIssues, fetchIssues, getIssues, handler, processContext, utility;

  handler = require('./handler');

  utility = require('./utility');

  command = require('./command');

  processContext = function(editor) {
    return utility.getEditorData(editor).then(function(arg) {
      var contents, filepath, filetypes;
      filepath = arg.filepath, contents = arg.contents, filetypes = arg.filetypes;
      return {
        filepath: filepath,
        contents: contents,
        filetypes: filetypes
      };
    });
  };

  fetchIssues = function(arg) {
    var contents, filepath, filetypes, parameters;
    filepath = arg.filepath, contents = arg.contents, filetypes = arg.filetypes;
    parameters = utility.buildRequestParameters(filepath, contents, filetypes);
    parameters.event_name = 'FileReadyToParse';
    return handler.request('POST', 'event_notification', parameters).then(function(response) {
      return Promise.resolve(Array.isArray(response) ? response : []).then(function(issues) {
        return Promise.all(issues.map(function(issue) {
          if (issue.fixit_available) {
            return command.run('FixIt', [issue.location.line_num - 1, issue.location.column_num - 1]).then(function(response) {
              issue.fixits = Array.isArray(response != null ? response.fixits : void 0) ? response.fixits : [];
              return issue;
            });
          } else {
            issue.fixits = [];
            return Promise.resolve(issue);
          }
        }));
      }).then(function(issues) {
        return {
          issues: issues,
          filetypes: filetypes
        };
      });
    });
  };

  convertIssues = function(arg) {
    var converter, filetypes, issues;
    issues = arg.issues, filetypes = arg.filetypes;
    converter = function(filetype) {
      var clang, extractPoint, extractRange, extractRangeFromIssue, general;
      general = function(issue) {
        return {
          location: {
            file: issue.location.filepath,
            position: extractRangeFromIssue(issue)
          },
          severity: 'error',
          excerpt: issue.text,
          solutions: issue.fixits.map(function(solution) {
            var chunk;
            chunk = solution.chunks[0];
            return {
              position: extractRange(chunk.range),
              replaceWith: chunk.replacement_text
            };
          })
        };
      };
      clang = function(issue) {
        var result;
        result = general(issue);
        result.severity = (function() {
          switch (issue.kind) {
            case 'INFORMATION':
              return 'info';
            case 'WARNING':
              return 'warning';
            case 'ERROR':
              return 'error';
            default:
              return result.severity;
          }
        })();
        return result;
      };
      extractPoint = function(point) {
        return [point.line_num - 1, point.column_num - 1];
      };
      extractRange = function(range) {
        return [extractPoint(range.start), extractPoint(range.end)];
      };
      extractRangeFromIssue = function(arg1) {
        var location, location_extent;
        location = arg1.location, location_extent = arg1.location_extent;
        if (location_extent.start.line_num > 0 && location_extent.end.line_num > 0) {
          return extractRange(location_extent);
        } else {
          return [extractPoint(location), extractPoint(location)];
        }
      };
      switch (filetype) {
        case 'c':
        case 'cpp':
        case 'objc':
        case 'objcpp':
          return clang;
        default:
          return general;
      }
    };
    return issues.map(converter(filetypes[0]));
  };

  getIssues = function(context) {
    return Promise.resolve(context).then(processContext).then(fetchIssues).then(convertIssues);
  };

  module.exports = getIssues;

}).call(this);
