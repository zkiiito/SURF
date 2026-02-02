export function wordwrap(str: string, intWidth?: number, strBreak?: string, cut?: boolean): string {
  intWidth = intWidth ?? 75
  strBreak = strBreak ?? '\n'
  cut = cut ?? false

  if (intWidth < 1) {
    return str
  }

  const reLineBreaks = /\r\n|\n|\r/
  const reBeginningUntilFirstWhitespace = /^\S*/
  const reLastCharsWithOptionalTrailingWhitespace = /\S*(\s)?$/

  const lines = str.split(reLineBreaks)
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    let newLine = ''

    while (line.length > intWidth) {
      const slice = line.slice(0, intWidth + 1)
      let ltrim = 0
      let rtrim = 0

      const match = slice.match(reLastCharsWithOptionalTrailingWhitespace)

      let j: number
      if (match && match[1]) {
        j = intWidth
        ltrim = 1
      } else {
        j = slice.length - (match?.[0].length || 0)

        if (j) {
          rtrim = 1
        }

        if (!j && cut && intWidth) {
          j = intWidth
        }

        if (!j) {
          const charsUntilNextWhitespace = (line.slice(intWidth).match(reBeginningUntilFirstWhitespace) || [''])[0]
          j = slice.length + charsUntilNextWhitespace.length
        }
      }

      newLine += line.slice(0, j - rtrim)
      line = line.slice(j + ltrim)
      newLine += line.length ? strBreak : ''
    }

    result.push(newLine + line)
  }

  return result.join('\n')
}

export function nl2br(str: string | null | undefined, isXhtml?: boolean): string {
  if (typeof str === 'undefined' || str === null) {
    return ''
  }

  const breakTag = isXhtml || typeof isXhtml === 'undefined' ? '<br />' : '<br>'
  return (str + '').replace(/(\r\n|\n\r|\r|\n)/g, breakTag + '$1')
}

export function stripTags(input: string, allowed?: string): string {
  allowed = (((allowed || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('')

  const tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi
  const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi

  return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
    return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : ''
  })
}

