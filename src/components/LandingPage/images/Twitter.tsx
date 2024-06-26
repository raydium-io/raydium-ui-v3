import { SvgIcon } from '@/icons/type'

export default function Twitter(props: SvgIcon) {
  const { width = 21, height = 20 } = props

  return (
    <svg width={width} height={height} viewBox="0 0 21 20" fill="none" className="chakra-icon" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.9023 4.60911C18.2872 4.91193 17.6197 5.09398 16.9359 5.1454C17.6625 4.7288 18.1972 4.04439 18.4256 3.23859C17.764 3.63826 17.0383 3.9205 16.2805 4.07282C15.3229 3.05672 13.8432 2.72599 12.5442 3.23774C11.2451 3.74948 10.3885 5.00057 10.3813 6.39675C10.3813 6.69468 10.4409 6.93304 10.4409 7.17139C7.68882 7.05835 5.12218 5.75328 3.40951 3.59612C3.09934 4.14101 2.93513 4.75677 2.93281 5.38375C2.92156 6.5405 3.50707 7.62144 4.48209 8.24397C3.94055 8.22535 3.4105 8.08265 2.93281 7.82685V7.88644C2.93077 9.51117 4.07966 10.9098 5.67385 11.2234C5.38053 11.2923 5.08115 11.3322 4.78003 11.3425C4.55986 11.3523 4.33937 11.3323 4.12457 11.2829C4.58529 12.6779 5.87365 13.6322 7.34231 13.6665C6.13315 14.6127 4.64686 15.1361 3.11157 15.1562C2.83217 15.166 2.55251 15.146 2.27734 15.0966C3.84388 16.0978 5.66193 16.635 7.52107 16.6458C13.8374 16.6458 17.2339 11.4021 17.2339 6.93304V6.51592C17.868 5.95296 18.4285 5.31231 18.9023 4.60911Z"
        fill="url(#paint0_linear_12731_11901)"
      />
      <defs>
        <linearGradient id="paint0_linear_12731_11901" x1="18.0263" y1="26.4538" x2="2.10361" y2="25.7672" gradientUnits="userSpaceOnUse">
          <stop stopColor="#39D0D8" />
          <stop offset="1" stopColor="#22D1F8" />
        </linearGradient>
      </defs>
    </svg>
  )
}
