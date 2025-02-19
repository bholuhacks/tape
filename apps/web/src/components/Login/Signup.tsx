import { zodResolver } from '@hookform/resolvers/zod'
import useHandleWrongNetwork from '@hooks/useHandleWrongNetwork'
import usePendingTxn from '@hooks/usePendingTxn'
import { TAPE_SIGNUP_PROXY_ABI } from '@tape.xyz/abis'
import { useDebounce } from '@tape.xyz/browser'
import {
  COMMON_REGEX,
  ERROR_MESSAGE,
  LENS_NAMESPACE_PREFIX,
  MOONPAY_URL,
  TAPE_SIGNUP_PRICE,
  TAPE_SIGNUP_PROXY_ADDRESS,
  ZERO_ADDRESS
} from '@tape.xyz/constants'
import { EVENTS, Tower } from '@tape.xyz/generic'
import {
  useGenerateLensApiRelayAddressLazyQuery,
  useProfileLazyQuery
} from '@tape.xyz/lens'
import type { CustomErrorWithData } from '@tape.xyz/lens/custom-types'
import {
  Button,
  CheckOutline,
  InfoOutline,
  Input,
  Modal,
  Spinner,
  TimesOutline,
  Tooltip
} from '@tape.xyz/ui'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { formatUnits, parseEther } from 'viem'
import { useAccount, useBalance, useWriteContract } from 'wagmi'
import type { z } from 'zod'
import { object, string } from 'zod'

const formSchema = object({
  handle: string()
    .min(5, { message: 'Handle should be at least 5 characters' })
    .max(26, { message: 'Handle should not exceed 26 characters' })
    .regex(COMMON_REGEX.HANDLE, {
      message:
        'Handle must start with a letter/number, only _ allowed in between'
    })
})
type FormData = z.infer<typeof formSchema>

const Signup = ({
  showLogin,
  onSuccess,
  setShowSignup
}: {
  showLogin: boolean
  onSuccess: () => void
  setShowSignup: (b: boolean) => void
}) => {
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  })

  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [isHandleAvailable, setIsHandleAvailable] = useState(false)
  const handleWrongNetwork = useHandleWrongNetwork()

  const { address } = useAccount()
  const handle = watch('handle')
  const debouncedValue = useDebounce<string>(handle, 500)
  const { data: balanceData } = useBalance({
    address,
    query: { refetchInterval: 2000 }
  })

  const [generateRelayerAddress] = useGenerateLensApiRelayAddressLazyQuery({
    fetchPolicy: 'no-cache'
  })
  const [checkAvailability, { loading: checkingAvailability }] =
    useProfileLazyQuery()

  const onError = (error: CustomErrorWithData) => {
    setCreating(false)
    toast.error(error?.name ?? error?.message ?? ERROR_MESSAGE)
  }

  const { writeContractAsync, data: txnHash } = useWriteContract({
    mutation: {
      onError
    }
  })

  const onSearchDebounce = async () => {
    if (handle?.trim().length) {
      const { data } = await checkAvailability({
        variables: {
          request: {
            forHandle: `${LENS_NAMESPACE_PREFIX}${handle}`
          }
        }
      })
      Tower.track(EVENTS.AUTH.SIGNUP_HANDLE_SEARCH, {
        handle: `${LENS_NAMESPACE_PREFIX}${handle}`
      })
      if (data?.profile) {
        return setIsHandleAvailable(false)
      }
      setIsHandleAvailable(true)
    }
  }

  const { indexed, error } = usePendingTxn({
    ...(txnHash && {
      txHash: txnHash
    })
  })

  useEffect(() => {
    if (indexed) {
      onSuccess()
      reset()
      toast.success('Profile created')
      setCreating(false)
      Tower.track(EVENTS.AUTH.SIGNUP_SUCCESS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexed, error])

  useEffect(() => {
    onSearchDebounce()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue])

  const signup = async ({ handle }: FormData) => {
    await handleWrongNetwork()

    setCreating(true)
    try {
      const { data } = await generateRelayerAddress()
      const relayerAddress = data?.generateLensAPIRelayAddress
      if (!relayerAddress) {
        setCreating(false)
        return toast.error(ERROR_MESSAGE)
      }
      return await writeContractAsync({
        abi: TAPE_SIGNUP_PROXY_ABI,
        address: TAPE_SIGNUP_PROXY_ADDRESS,
        args: [[address, ZERO_ADDRESS, '0x'], handle, [relayerAddress]],
        functionName: 'createProfileWithHandleUsingCredits',
        value: parseEther(TAPE_SIGNUP_PRICE.toString())
      })
    } catch {}
  }

  const balance = balanceData && parseFloat(formatUnits(balanceData.value, 18))
  const hasBalance = balance && balance >= TAPE_SIGNUP_PRICE

  return (
    <form onSubmit={handleSubmit(signup)} className="space-y-2">
      <div className="relative flex items-center">
        <Input
          className="h-[46px] text-base"
          placeholder="gilfoyle"
          autoComplete="off"
          prefix={`@${LENS_NAMESPACE_PREFIX}`}
          error={errors.handle?.message}
          {...register('handle')}
        />
        {isValid && (
          <div className="flex items-center">
            {checkingAvailability ? (
              <span className="absolute right-3 text-white">
                <Spinner size="sm" />
              </span>
            ) : (
              <Tooltip
                content={
                  isHandleAvailable
                    ? `@${LENS_NAMESPACE_PREFIX}${handle} is available`
                    : `@${LENS_NAMESPACE_PREFIX}${handle} is taken`
                }
                placement="top"
              >
                {isHandleAvailable ? (
                  <span className="absolute right-3 rounded-full bg-green-500 p-1 text-white">
                    <CheckOutline className="size-2" />
                  </span>
                ) : (
                  <span className="absolute right-3 rounded-full bg-red-500 p-1 text-white">
                    <TimesOutline className="size-2" outlined={false} />
                  </span>
                )}
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <Modal
        show={showModal}
        setShow={setShowModal}
        title="Why purchase?"
        description="Creating new handle requires a purchase to help maintain the network and prevent bots. Rest assured, the associated price is a short-term measure. As the platform implements and refines additional bot prevention methods, the price will be gradually phased out."
      >
        {!hasBalance && (
          <div className="mt-4">
            <Link
              href={`${MOONPAY_URL}?baseCurrencyAmount=15&currencyCode=MATIC&walletAddress=${address}`}
              target="_blank"
            >
              <Button variant="secondary">Buy MATIC</Button>
            </Link>
          </div>
        )}
      </Modal>
      <div className="relative flex items-center">
        <div className="w-full">
          <Button size="md" loading={creating} disabled={creating}>
            Sign up for {TAPE_SIGNUP_PRICE} MATIC
          </Button>
        </div>
        <button
          type="button"
          className="absolute right-2.5 z-[1] cursor-help p-1 text-xs"
          onClick={() => setShowModal(true)}
        >
          <InfoOutline className="size-4 text-white dark:text-black" />
        </button>
      </div>
      {showLogin && (
        <div className="flex items-center justify-center space-x-2 pt-3 text-sm">
          <span>Have an account?</span>
          <button
            type="button"
            className="text-brand-500 font-bold"
            onClick={() => setShowSignup(false)}
          >
            Login
          </button>
        </div>
      )}
    </form>
  )
}

export default Signup
