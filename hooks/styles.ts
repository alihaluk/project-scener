// How each shipped look draws the conversation's own rows in the desktop app.
// The words stay the app's text, so selecting, copying, finding and screen
// readers work as they do with no look.
//
// Every color here is a name that follows light and dark mode. The person's
// bubble takes `bg-user-message` and `text-user-message`, which config.ts works
// out from the look's palette in each mode. Its body text keeps the person's
// own font: only headings and tool rows take one, in the looks that call for it.
import type { ThemeMessageRule, ThemeStyle } from 'claude-code'

const BUBBLE: ThemeMessageRule = {
  backgroundColor: 'bg-user-message',
  color: 'text-user-message',
  paddingX: 14,
  paddingY: 10,
}

export const STYLES: Record<string, ThemeStyle> = {
  tide: {
    UserMessage: { ...BUBBLE, radius: 18 },
  },
  night: {
    UserMessage: { ...BUBBLE, radius: 14, borderColor: 'border-accent', borderWidth: 1, shadow: { blur: 12, color: 'border-accent' } },
  },
  circuit: {
    Heading: { fontFamily: ['mono'] },
    UserMessage: { ...BUBBLE, radius: 4, borderColor: 'border-accent', borderWidth: 1 },
    ToolUse: { fontFamily: ['code'], backgroundColor: 'surface-1', borderColor: 'border', borderWidth: 1, radius: 3, paddingX: 8 },
  },
  terrain: {
    Heading: { fontFamily: ['serif'], fontWeight: 'semibold' },
    UserMessage: { ...BUBBLE, radius: 6, shadow: { y: 2, blur: 6, color: 'border' } },
  },
  route: {
    // A speech bubble, its tail at the lower right.
    UserMessage: { ...BUBBLE, radius: [18, 18, 4, 18] },
  },
}
