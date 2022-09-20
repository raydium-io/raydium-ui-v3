import type { FC, ReactNode } from 'react'

import { ChakraProvider, extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  components: {
    Avatar: {
      defaultProps: {
        variant: 'sm', // default is solid
        colorScheme: 'green' // default is gray
      }
    },
    Link: {
      variants: {
        outline: {
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'none'
          }
        }
      }
    }
  }
})
const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>
}

export default ThemeProvider
