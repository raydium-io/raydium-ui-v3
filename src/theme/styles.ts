export const styles = {
  global: {
    // Apply CSS variables for theme colors
    ':root': {
      '--primary-color': '#00ffff',
      '--secondary-color': '#ff00ff',
      '--bg-color': '#0a0a2a',
      '--text-color': '#ffffff',
    },

    // Global body styles using CSS variables
    'html, body, #__next, #app-layout': {
      height: '100%',
    },
    
    body: {
      fontFamily: `'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
      'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
      'Segoe UI Symbol'`,
      fontFeatureSettings: "'ss04', 'tnum' 1",
      background: 'var(--bg-color)', // Use the variable for background
      backgroundAttachment: 'fixed',
      color: 'var(--text-color)', // Use the variable for text color
    },

    // Custom scrollbar styles
    '::-webkit-scrollbar': {
      backgroundColor: 'transparent',
      width: '7px',
      height: '7px',
    },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: 'var(--primary-color)',
      borderRadius: '8px',
    },

    // Font-face for Space Grotesk
    '@font-face': {
      fontFamily: 'Space Grotesk',
      src: "url('/SpaceGrotesk[wght].woff2') format('woff2')",
      fontWeight: '300',
    },
  }
}
