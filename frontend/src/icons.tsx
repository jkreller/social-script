// Central icon module. Two sources:
// - pxlkit (github.com/joangeldelarosa/pxlkit) — the primary pixel-art set matching the brand
//   look. Free tier requires visible attribution (see InfoOverlay). PxlKitIcon renders as an
//   <img> with a baked SVG data URI, so it CANNOT resolve CSS custom properties or
//   currentColor — every call site must pass a literal hex via the `color` prop.
// - pixelarticons (MIT, halfmage/pixelarticons) — fills gaps pxlkit's free packs don't cover
//   (Gamepad, Volume, chevrons). These render as inline SVG with fill="currentColor", so they
//   behave like normal icon fonts and pick up CSS `color` from their parent.
import { PxlKitIcon, AnimatedPxlKitIcon, type PxlKitData } from '@pxlkit/core'
import { Play as UiPlay, Pause as UiPause, Close as UiClose, Check as UiCheck } from '@pxlkit/ui'
import { Flag as GameFlag, Star as GameStar, Potion as GamePotion, SpellBook as GameSpellBook, Heart as GameHeart, Lightning as GameLightning, Gem as GameGem, Scroll as GameScroll } from '@pxlkit/gamification'
import { Megaphone as FeedbackMegaphone, InfoCircle as FeedbackInfoCircle, TypingDots as FeedbackTypingDots, Mail as FeedbackMail } from '@pxlkit/feedback'
import { UserGroup as SocialUserGroup, User as SocialUser, Pin as SocialPin } from '@pxlkit/social'
import { Clock as UiClock, Palette as UiPalette, Package as UiPackage } from '@pxlkit/ui'
import { Flame as EffectsFlame, ExplosionBurst as EffectsExplosionBurst, GlowPulse as EffectsGlowPulse } from '@pxlkit/effects'

export { Gamepad, Volume, Camera, ChevronLeft, ChevronRight, ChevronDown } from 'pixelarticons/react'

// Brand hex — mirrors theme.css tokens. Duplicated here only because pxlkit's <img>-based
// icons can't read CSS variables; keep in sync with theme.css if the palette ever changes.
export const HEX = {
  fg: '#ffffff',
  ink: '#2a004d',
  accent: '#FFD300',
  muted: '#d9b3ff',
} as const

interface IconProps {
  size?: number
  color?: string
}

interface PaletteIconProps extends IconProps {
  // 'palette' renders the icon's original multi-color artwork and ignores `color`;
  // 'solid' (default) flattens every pixel to `color`, matching the rest of the app's
  // flat accent-colored icon look.
  appearance?: 'solid' | 'palette'
}

export const Play = ({ size = 24, color = HEX.fg }: IconProps) => (
  <PxlKitIcon icon={UiPlay} size={size} appearance="solid" color={color} />
)
export const Pause = ({ size = 24, color = HEX.fg }: IconProps) => (
  <PxlKitIcon icon={UiPause} size={size} appearance="solid" color={color} />
)
export const Close = ({ size = 24, color = HEX.fg }: IconProps) => (
  <PxlKitIcon icon={UiClose} size={size} appearance="solid" color={color} />
)
export const Check = ({ size = 24, color = HEX.fg }: IconProps) => (
  <PxlKitIcon icon={UiCheck} size={size} appearance="solid" color={color} />
)
export const Flag = ({ size = 24, color = HEX.fg }: IconProps) => (
  <PxlKitIcon icon={GameFlag} size={size} appearance="solid" color={color} />
)
export const Star = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={GameStar} size={size} appearance={appearance} color={color} />
)
export const Potion = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={GamePotion} size={size} appearance={appearance} color={color} />
)
export const SpellBook = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={GameSpellBook} size={size} appearance={appearance} color={color} />
)
export const Heart = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={GameHeart} size={size} appearance={appearance} color={color} />
)
export const Lightning = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={GameLightning} size={size} appearance={appearance} color={color} />
)
export const Flame = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <AnimatedPxlKitIcon icon={EffectsFlame} size={size} appearance={appearance} color={color} />
)
export const ExplosionBurst = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <AnimatedPxlKitIcon icon={EffectsExplosionBurst} size={size} appearance={appearance} color={color} />
)
export const GlowPulse = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <AnimatedPxlKitIcon icon={EffectsGlowPulse} size={size} appearance={appearance} color={color} />
)
export const Gem = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={GameGem} size={size} appearance={appearance} color={color} />
)
export const Scroll = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={GameScroll} size={size} appearance={appearance} color={color} />
)
export const Megaphone = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={FeedbackMegaphone} size={size} appearance={appearance} color={color} />
)
export const TypingDots = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <AnimatedPxlKitIcon icon={FeedbackTypingDots} size={size} appearance={appearance} color={color} />
)
export const InfoCircle = ({ size = 24, color = HEX.fg }: IconProps) => (
  <PxlKitIcon icon={FeedbackInfoCircle} size={size} appearance="solid" color={color} />
)
export const UserGroup = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={SocialUserGroup} size={size} appearance={appearance} color={color} />
)
export const User = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={SocialUser} size={size} appearance={appearance} color={color} />
)
export const Pin = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={SocialPin} size={size} appearance={appearance} color={color} />
)
export const Clock = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={UiClock} size={size} appearance={appearance} color={color} />
)
export const Palette = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={UiPalette} size={size} appearance={appearance} color={color} />
)
export const Package = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={UiPackage} size={size} appearance={appearance} color={color} />
)
export const Mail = ({ size = 24, color = HEX.fg, appearance = 'solid' }: PaletteIconProps) => (
  <PxlKitIcon icon={FeedbackMail} size={size} appearance={appearance} color={color} />
)

// Instagram doesn't ship in any pxlkit pack — hand-authored pixel art in the same
// grid format, used only by the /psssssssssst teaser's Instagram link.
const InstagramData: PxlKitData = {
  name: 'instagram',
  size: 16,
  category: 'custom',
  grid: [
    '..AAAAAAAAEEEE..',
    '.AAAAAEEEEEEEEE.',
    'AAAEFFFFFFFFEEEE',
    'AAEFFFFFFFFFFEEE',
    'AEFFFEEBBBBBFFEE',
    'EEFFEBBFFBFBFFEE',
    'EEFFBBFFFFBBFFEE',
    'EBFFBFFBBFFBFFBE',
    'EBFFDFFDBFFBFFBE',
    'DDFFDDFFFFBBFFBB',
    'DDFFDDDFFDBBFFBB',
    'DDFFFCDDDDDFFFBB',
    'DDCFFFFFFFFFFBBB',
    'DCCCFFFFFFFFBBBB',
    '.CCCCCCCCDDDBBB.',
    '..CCCCCCCCDDDB..',
  ],
  palette: {
    A: '#4B62D4',
    B: '#D32F8C',
    C: '#FFDD80',
    D: '#F26A39',
    E: '#9237C0',
    F: '#FFFFFF',
  },
  tags: [],
}
export const Instagram = ({ size = 24, color = HEX.fg, appearance = 'palette' }: PaletteIconProps) => (
  <PxlKitIcon icon={InstagramData} size={size} appearance={appearance} color={color} />
)
