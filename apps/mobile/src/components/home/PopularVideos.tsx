import { useNavigation } from '@react-navigation/native'
import { LENS_CUSTOM_FILTERS, LENSTUBE_BYTES_APP_ID } from '@tape.xyz/constants'
import { getThumbnailUrl, imageCdn, trimify } from '@tape.xyz/generic'
import type {
  ExplorePublicationRequest,
  MirrorablePublication
} from '@tape.xyz/lens'
import {
  ExplorePublicationsOrderByType,
  ExplorePublicationType,
  LimitType,
  PublicationMetadataMainFocusType,
  useExplorePublicationsQuery
} from '@tape.xyz/lens'
import type { MobileThemeConfig } from '@tape.xyz/lens/custom-types'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Skeleton } from 'moti/skeleton'
import React from 'react'
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'

import normalizeFont from '~/helpers/normalize-font'
import { useMobileTheme } from '~/hooks'
import useMobileStore from '~/store'

import UserProfile from '../common/UserProfile'
import HCarousel from '../ui/HCarousel'
import ServerError from '../ui/ServerError'

const CAROUSEL_HEIGHT = 210
const BORDER_RADIUS = 25

const styles = (themeConfig: MobileThemeConfig) =>
  StyleSheet.create({
    container: {
      paddingTop: 30,
      position: 'relative',
      flex: 1,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center'
    },
    thumbnail: {
      width: '100%',
      height: CAROUSEL_HEIGHT,
      borderRadius: BORDER_RADIUS,
      borderColor: themeConfig.borderColor,
      borderWidth: 1
    },
    gradient: {
      alignSelf: 'center',
      position: 'absolute',
      top: 0,
      marginTop: 1,
      right: 1,
      left: 1,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 15,
      paddingVertical: 12,
      opacity: 0.8,
      borderTopLeftRadius: BORDER_RADIUS,
      borderTopRightRadius: BORDER_RADIUS,
      zIndex: 2
    },
    otherInfo: {
      fontFamily: 'font-medium',
      fontSize: normalizeFont(10),
      color: themeConfig.textColor
    },
    title: {
      fontFamily: 'font-bold',
      color: themeConfig.textColor,
      fontSize: normalizeFont(10),
      width: '60%'
    }
  })

const PopularVideos = () => {
  const { navigate } = useNavigation()
  const { themeConfig } = useMobileTheme()
  const style = styles(themeConfig)

  const homeGradientColor = useMobileStore((state) => state.homeGradientColor)

  const request: ExplorePublicationRequest = {
    limit: LimitType.TwentyFive,
    orderBy: ExplorePublicationsOrderByType.TopCollectedOpenAction,
    where: {
      publicationTypes: [ExplorePublicationType.Post],
      customFilters: LENS_CUSTOM_FILTERS,
      metadata: {
        mainContentFocus: [
          PublicationMetadataMainFocusType.Audio,
          PublicationMetadataMainFocusType.Video
        ]
      }
    }
  }

  const { data, loading, error } = useExplorePublicationsQuery({
    variables: {
      request
    }
  })
  const publications = data?.explorePublications
    ?.items as MirrorablePublication[]

  if (error || !publications?.length) {
    return <ServerError />
  }

  return (
    <View style={style.container}>
      <Skeleton
        show={loading}
        colors={[`${homeGradientColor}10`, '#00000080']}
        radius={BORDER_RADIUS}
        height={CAROUSEL_HEIGHT}
      >
        <View>
          <HCarousel
            height={CAROUSEL_HEIGHT}
            borderRadius={BORDER_RADIUS}
            data={publications}
            renderItem={({ item }: { item: MirrorablePublication }) => {
              const isBytes = item.publishedOn?.id === LENSTUBE_BYTES_APP_ID
              const thumbnailUrl = imageCdn(
                getThumbnailUrl(item.metadata, true),
                isBytes ? 'THUMBNAIL_V' : 'THUMBNAIL'
              )
              return (
                <Pressable
                  onPress={() => navigate('WatchScreen', { id: item.id })}
                >
                  <ImageBackground
                    source={{
                      uri: thumbnailUrl
                    }}
                    blurRadius={15}
                    style={{ position: 'relative' }}
                    imageStyle={{ opacity: 0.8, borderRadius: BORDER_RADIUS }}
                  >
                    <LinearGradient
                      colors={['#00000090', '#00000080', 'transparent']}
                      style={style.gradient}
                    >
                      <Text numberOfLines={1} style={style.title}>
                        {trimify(item.metadata.marketplace?.name ?? '')}
                      </Text>
                      <UserProfile profile={item.by} size={15} radius={3} />
                    </LinearGradient>
                    <ExpoImage
                      source={{
                        uri: thumbnailUrl
                      }}
                      transition={300}
                      contentFit={isBytes ? 'contain' : 'cover'}
                      style={style.thumbnail}
                    />
                  </ImageBackground>
                </Pressable>
              )
            }}
          />
        </View>
      </Skeleton>
    </View>
  )
}

export default PopularVideos
