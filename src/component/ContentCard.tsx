import { ReactNode } from 'react'
import { Box } from '@chakra-ui/react'

export default function ContentCard({ children }: { children: ReactNode }) {
  return (
    <Box w="fit-content" mt="20px" mx="auto" p="20px" border="1px solid grey" borderRadius="10px">
      {children}
    </Box>
  )
}
