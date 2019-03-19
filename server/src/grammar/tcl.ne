Script -> Line:+ {% id %}

Line -> Command _ Terminator {% d=>d[0] %}
        | Comment Newline {% d=>d[0] %}

Command -> FirstWord (__ Word):* {% d=>{return{command: d[0], arguments: d[1].map(x=>x[1])}} %}

FirstWord -> [^\s#] [^\s]:* {% d=>d[0]+d[1].join('') %}
Word -> _bareword {% id %}
        | _quoted_word {% id %}
		| _expanded_word {% id %}
		| _braced_word {% id %}
		| _substituted_word {% id %}
		
_bareword -> [^\s"{] [^\s]:* {% d=>d[0]+d[1].join('') %}
_quoted_word -> "\"" _ _bareword:? (__ _bareword):* _ "\""
  {% d=>{return{type: 'quoted', words: [d[2]].concat(d[3].map(x=>x[1]))}} %}
_expanded_word -> "{*}" (_bareword | _quoted_word) {% d=>{return {type: 'expanded', word: d[1]}} %}
_braced_word -> "{" _ _bareword:? (__ _bareword):* _ "}"
  {% d=>{return{type: 'braced', words: [d[2]].concat(d[3].map(x=>x[1]))}} %}
_substituted_word -> _bareword:? ("[" Command "]" _bareword:?):+
  {% d=>{return{type: 'substituted', words: [d[0]].concat([].concat.apply([], d[1].map(x=>[x[1],x[3]])))}} %}

# Whitespace
_ -> null | _ [\t ] {% function() {} %}
__ -> [\t ] | __ [\t ] {% function() {} %}
Comment -> "#" .:* {% d=>{return {type: 'comment', text: d[1].join('')}} %}
Terminator -> ";" | Newline
Newline -> "\r\n" | "\n"