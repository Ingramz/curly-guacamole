(function() {
  var CompositeDisposable, DirectoryCSSSearcher, File, MarkupParser, Point, QuickEditor, QuickEditorCache, Range, TextBuffer, quickEditorView, ref;

  quickEditorView = require('./quick-editor-view');

  DirectoryCSSSearcher = require('./directory-css-searcher');

  MarkupParser = require('./markup-parser');

  QuickEditorCache = require('./quick-editor-cache');

  ref = require('atom'), Range = ref.Range, Point = ref.Point, CompositeDisposable = ref.CompositeDisposable, TextBuffer = ref.TextBuffer, File = ref.File;

  module.exports = QuickEditor = {
    config: {
      stylesDirectory: {
        type: 'string',
        "default": ''
      }
    },

    /* Life Cycle Methods */
    quickEditorView: null,
    panel: null,
    subscriptions: null,
    searcher: null,
    parser: null,
    activate: function() {
      this.quickEditorView = new quickEditorView();
      this.quickEditorView.setOnSelectorAdded(this.selectorAdded.bind(this));
      this.panel = atom.workspace.addBottomPanel({
        item: this.quickEditorView,
        visible: false
      });
      this.cssCache = new QuickEditorCache;
      this.searcher = new DirectoryCSSSearcher;
      this.parser = new MarkupParser;
      this.subscriptions = new CompositeDisposable;
      return this.subscriptions.add(atom.commands.add('atom-text-editor', {
        'quick-editor:quick-edit': (function(_this) {
          return function() {
            return _this.quickEdit();
          };
        })(this)
      }));
    },
    deactivate: function() {
      this.panel.destroy();
      this.subscriptions.dispose();
      return this.quickEditorView.destroy();
    },

    /* Functionality Methods */
    quickEdit: function() {
      var e;
      if (this.panel.isVisible()) {
        this.closeView(this.found);
        return this.panel.hide();
      } else {
        try {
          this.selector = this.parseSelectedCSSSelector();
        } catch (error) {
          e = error;
          atom.beep();
          console.warn(e.message);
          return;
        }
        return this.findFilesFromCSSIdentifier(this.selector).then((function(_this) {
          return function(arg) {
            var found, result;
            found = arg[0], result = arg[1];
            if (found) {
              _this.setupForEditing(result.text, result.start, result.end, result.file);
              return _this.edit();
            } else {
              return _this.addNewSelector(_this.selector);
            }
          };
        })(this))["catch"](function(e) {
          return console.error(e.message, e.stack);
        });
      }
    },
    findFilesFromCSSIdentifier: function(identifier) {
      return this.searcher.findFilesThatContain(identifier).then((function(_this) {
        return function() {
          return _this.searcher.getSelectorText().then(function(arg) {
            var found, path, result;
            found = arg[0], result = arg[1];
            _this.found = found;
            _this.searcher.clear();
            if (found) {
              path = atom.workspace.getActiveTextEditor().getPath();
              _this.cssCache.put(path, result.file.getPath());
            }
            return [found, result];
          });
        };
      })(this))["catch"](function(e) {
        return console.error(e.message, e.stack);
      });
    },
    parseSelectedCSSSelector: function() {
      var editor;
      editor = atom.workspace.getActiveTextEditor();
      this.parser.setEditor(editor);
      return this.parser.parse();
    },
    setupForEditing: function(text, start, end, file) {
      var range;
      this.quickEditorView.setText(text);
      this.quickEditorView.setFile(file);
      this.quickEditorView.setGrammar();
      range = new Range(new Point(start, 0), new Point(end, 2e308));
      return this.quickEditorView.setEditRange(range);
    },
    edit: function() {
      this.panel.show();
      return this.quickEditorView.attachEditorView();
    },
    addNewSelector: function(selector) {
      var path;
      if (!(path = this.cssCache.get(atom.workspace.getActiveTextEditor().getPath()))) {
        path = atom.project.getPaths()[0];
      }
      this.quickEditorView.attachAddSelectorView(selector, path);
      return this.panel.show();
    },
    selectorAdded: function(path, selector) {
      var buffer, file;
      file = new File(path, false);
      buffer = new TextBuffer();
      buffer.setPath(path);
      return file.read().then((function(_this) {
        return function(text) {
          buffer.setText(text);
          buffer.append("\n" + selector + " {\n\n}");
          buffer.save();
          _this.closeView(false);
          _this.panel.hide();
          return _this.findFilesFromCSSIdentifier(selector).then(function(arg) {
            var found, result;
            found = arg[0], result = arg[1];
            _this.setupForEditing(result.text, result.start, result.end, result.file);
            return _this.edit();
          });
        };
      })(this));
    },
    closeView: function(edit) {
      if (edit) {
        return this.quickEditorView.detachEditorView();
      } else {
        return this.quickEditorView.detachAddSelectorView();
      }
    },

    /* Methods for testing */
    getView: function() {
      return this.quickEditorView;
    }
  };

}).call(this);
