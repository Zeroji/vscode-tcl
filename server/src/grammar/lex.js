const moo = require('moo')

let lexer = moo.compile({
    WS:         /[ \t]+/,
    comment:    /#.*?$/,
    number:     /0|[1-9][0-9]*/,
    string:     {match: /"(?:\\["\\]|[^"\\])*"/, lineBreaks: true},
    braces:     {match: /\{(?:\\[}\\]|[^}\\])*\}/, lineBreaks: true},
    words:      /\w+/,
    NL:         {match: /\r?\n/, lineBreaks: true}
})

const fs = require('fs')

let data = fs.readFileSync('sample.tcl', {encoding: 'utf-8'})

lexer.reset(data)
while(res = lexer.next()) {
    console.log(res)
}