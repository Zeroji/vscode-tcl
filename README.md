# vscode-tcl

TCL language support for Visual Studio Code. **WIP.**

## Pull Requests welcome!

This is largely a work in progress, I am building it during my free time to
help me at work - this means features may be lacking or underdeveloped.

**All pull requests and issues are welcome.**

### TCL Syntax Parsing

As of now, regular expressions are being used. I have started to work with
tools such as [nearley] and [moo], but all help is appreciated!

## Language server features

This is mainly based on the [lsp-sample] project, and adapted to work with
TCL files. A few features are currently available:

### Document Symbols

Namespaces and procedures will be recognized as symbols, and shown in the
Outline view and in Breadcrumbs. Nested symbols work properly, but due to
the fragile parsing (currently using RegExp instead of a proper grammar),
closing braces (`}`) too close to one another might cause errors.

[nearley]: https://nearley.js.org/
[moo]: https://github.com/no-context/moo
[lsp-sample]: https://github.com/Microsoft/vscode-extension-samples/tree/master/lsp-sample

### Syntax highlighting *not included*

Please use another extension (such as <https://github.com/rashwell/tcl>)
to add syntax highlighting and snippets, and adding the `tcl` language.
