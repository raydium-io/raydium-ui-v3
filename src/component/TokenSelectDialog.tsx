import { useState, useCallback, useEffect, ChangeEvent } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  List,
  ListItem,
  Avatar,
  Input
} from '@chakra-ui/react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { TokenJson } from '@raydium-io/raydium-sdk'
import shallow from 'zustand/shallow'
import { useTokenStore, useTokenAccountStore } from '@/store'

interface Props {
  onSelectValue: (token: TokenJson) => void
  isOpen: boolean
  onClose: () => void
}

const perPage = 30

const TokenSelectDialog = function TokenSelectDialog(props: Props) {
  const { onSelectValue, isOpen, onClose } = props

  const tokenList = useTokenStore((s) => s.tokenList)
  const [getTokenBalanceUiAmount] = useTokenAccountStore((s) => [s.getTokenBalanceUiAmount, s.tokenAccounts], shallow)

  const [filteredList, setFilteredList] = useState<TokenJson[]>(tokenList)
  const [displayList, setDisplayList] = useState<TokenJson[]>([])
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    setDisplayList(tokenList.slice(0, perPage))
  }, [tokenList])

  useEffect(() => {
    const filteredList = tokenList.filter(
      (token) => token.symbol.toLocaleLowerCase().indexOf(search.toLocaleLowerCase()) > -1 || token.mint === search
    )
    setDisplayList(filteredList.slice(0, perPage))
    setFilteredList(filteredList)
  }, [search, tokenList])

  const fetchData = useCallback(() => {
    setDisplayList((list) => list.concat(filteredList.slice(list.length, list.length + perPage)))
  }, [filteredList])

  const handleClose = useCallback(() => {
    onClose()
    setSearch('')
  }, [onClose])

  const handleClick = useCallback(
    (val: TokenJson) => {
      onSelectValue(val)
      handleClose()
    },
    [onSelectValue, handleClose]
  )

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.currentTarget.value)
  }, [])

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Token</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input mb="10px" placeholder="Search" onChange={handleSearchChange} />
            {tokenList.length ? (
              <InfiniteScroll
                dataLength={displayList.length} //This is important field to render the next data
                next={fetchData}
                hasMore={displayList.length < filteredList.length}
                height={300}
                loader={<h4>Loading...</h4>}
              >
                <List spacing={3}>
                  {displayList.map((token) => (
                    <ListItem
                      key={token.mint}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        p: '4px',
                        '&:hover': {
                          bg: 'gray.50'
                        }
                      }}
                      onClick={() => handleClick(token)}
                    >
                      <div>
                        <Avatar size="sm" mr="5px" name={token.symbol} src={token.icon} />
                        {token.symbol}
                      </div>
                      <div>{getTokenBalanceUiAmount({ mint: token.mint }).text}</div>
                    </ListItem>
                  ))}
                </List>
              </InfiniteScroll>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

export default TokenSelectDialog
