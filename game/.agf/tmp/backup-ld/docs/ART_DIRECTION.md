# Art direction — Kabaddi Ghost Raids: Raid League

Target: .agf/art/target.png (vs big-studio games EA SPORTS FC Soccer Mobile 27 -0.5, Top Eleven Be a Soccer Manager +1.5, Cricket League 0 → net +0.3 (need ≥ 0)). Every screen must look like it.

## Style
Premium stylised-realistic 2.5D sports-hero look, in the spirit of EA FC Mobile and Cricket League: chunky confident silhouettes with slightly oversized heads, hands and feet, athletic proportions, and warm expressive faces. Rendering is clean soft-gradient cel shading: two to three tonal steps per surface, a crisp rim light in warm gold on the key side and a cool indigo bounce on the shadow side, and a thin dark-indigo outline (2-3 px at 1080p) that thickens at the silhouette. Materials are readable at thumbnail size: matte mud-brown and sand mats with fine grain, glossy lacquered synthetic mats with soft specular streaks, satin jersey fabric with subtle fold highlights, polished brushed-gold trim, and frosted glass HUD panels with an inner glow. Lighting is dramatic stadium floodlighting from above-front, with volumetric light shafts, soft bloom on gold and neon, and a gentle vignette. The mat is the brightest, cleanest area, with a clear value hierarchy: mat and players first, HUD second, crowd last. The crowd is blurred, desaturated and low-contrast, and sits in a parallax far layer with depth haze. The mood is electric, proud and festive: a night-match arena in saturated indigo and royal blue, hot saffron and gold, and a punchy crimson accent. Ghost mechanics use a translucent cyan-violet holographic trail with scanline shimmer and soft additive glow, clearly distinct from real players. There is no gore and no violence; contact reads as athletic, with dust puffs and impact starbursts. Detailing stays uncluttered, with no text baked into images and no real brands.

## Palette
#1B1F5E #FFB400 #E8363D #12B5E5 #F4EBD8 #0B0D2B

UI kit tokens (src/ui/theme.ts): {"primary":"#FFB400","primaryDark":"#C77700","secondary":"#2D3BCB","secondaryDark":"#1B1F5E","accent":"#12B5E5","accentDark":"#0A7FA6","bgTop":"#2A2F8F","bgBottom":"#0B0D2B","ink":"#F4EBD8"}

## Screen spec
- **background**: Side-on 2.5D night arena in a parallax far layer: tiered crowd silhouettes, blurred and desaturated, with floodlight bloom, soft volumetric beams, indigo-to-navy depth haze and a faint vignette. Low contrast so the mat dominates, with no text, no brands and no sharp detail behind the HUD.
- **board**: The kabaddi mat is seen in a slight top-down 3/4 perspective. It is a lacquered royal-blue and sand-yellow synthetic surface with fine grain and a soft specular sheen, with crisp white line markings for the midline, baulk line, bonus line and lobbies. A gold-trimmed rounded frame with a dark inner shadow sits around the mat. The raid path appears as a glowing dashed gold line with a pulsing end node. The defenders' danger zones are soft translucent red radial discs with a thin bright rim. The reach range is a cyan ring.
- **pieces**: Chibi-athletic kabaddi players about 1.3x head scale, in team jerseys with a satin sheen and bold number patches (no text on art). The raider has a gold ring under their feet and a warm rim light. Defenders form a chain in a contrasting team colour, and the selected defender has a bright white-cyan radial highlight. Ghost raiders are translucent cyan-violet holograms with scanline shimmer and a motion-trail afterimage. Each piece has a soft elliptical contact shadow.
- **hud**: Frosted dark-indigo glass plates with a 1 px gold hairline and an inner glow. The top bar has a left team crest and score, a centre match clock with a 30 s raid timer ring in gold that shifts to crimson in the last 5 s, and a right crest and score. Below it sit a slim referee panel strip, a stamina bar with a cyan fill and a hold-meter bar with a crimson fill. Small circular icons carry coins and Chant Tokens. Everything stays in the top 12% and the bottom 22% of the screen, leaving the mat clear.
- **buttons**: Thumb-arc move buttons are glossy circular gem buttons 64-72 dp wide, with a thick gold bevel, a vertical gradient fill, a soft top highlight, a drop shadow and a coloured icon glyph. Each move has its own colour: Hand Touch is saffron, Dash is crimson, Dubki is cyan, Toe is violet and Kick is green. Pressed state: scale 0.94 with a darker fill and inner shadow. Primary CTA plates are pill-shaped gold with a dark-gold lower lip and a highlight streak. Secondary plates are royal-blue with a gold hairline. The virtual drag zone is a faint ring.
- **typography**: A heavy, slightly italic condensed display face for headlines, scores and banners, with a gold-to-cream vertical gradient, a thick dark-indigo outline and a hard drop shadow. A clean rounded sans for body and stats in cream #F4EBD8 on dark. Numbers are tabular and bold. Letter-spacing is generous on small caps labels.
- **popups**: Centered rounded cards with a deep indigo gradient, a gold bevelled border and a soft outer glow, over a 60% navy scrim with a background blur. A banner ribbon sits at the top with a crest and a shine sweep. Reward rows use dark inset slots with icon and count. Close buttons are small round crimson gems. Do-or-Die and Super Raid banners are full-width diagonal slashes in crimson and gold with a referee silhouette.
- **fx**: Dust puffs and a sand burst on touch and tackle, gold starburst impact flashes, speed-line streaks on a Dash, a cyan hologram trail with scanline shimmer on ghosts, confetti and light rays on scoring, a coin shower on rewards, and a radial pulse on a selected defender. Additive blending with soft bloom, no gore or blood.
- **motion**: Snappy, with ease-out-back on popups at 220 ms. Button press 80 ms. Score numbers tick up with a bounce and a gold flash. The raid path draws with a 150 ms trail. Banners slam in at 300 ms with a screen shake of 4 px and a 120 ms hit-stop on tackles. Ghost trails fade over 600 ms. The idle raider breathes in a 2 s loop. Reduced-motion setting replaces shakes and sweeps with fades.

## Assets (assets/art, indexed in src/art.ts)
- `bg_village_mat_far` (background, 1080x1920): Chapter 1 match parallax far layer
- `bg_night_stadium_far` (background, 1080x1920): Default league match background
- `bg_auction_hall` (background, 1080x1920): Auction Hall and menu background
- `mat_board` (ui, 512x402): Match board frame and mat surface
- `raider_saffron` (sprite, 504x512): Player raider in the match
- `defender_teal` (sprite, 463x512): Defender in the chain
- `defender_selected_ring` (fx, 512x207): Selected defender highlight
- `ghost_raider` (sprite, 445x512): Ghost raid replay raider
- `danger_zone_disc` (fx, 512x509): Defender danger zone under defenders
- `hud_panel` (ui, 357x512): Top HUD and scoreboard plate
- `btn_primary_gold` (ui, 512x251): Primary CTA button plate
- `btn_secondary_blue` (ui, 512x295): Secondary button plate
- `btn_move_gem` (ui, 493x512): Circular move buttons for Hand Touch, Dash and Dubki
- `icon_coin_token` (ui, 512x298): Reward icons for coins and Chant Tokens
- `fx_impact_burst` (fx, 470x512): Touch and tackle impact
- `hero_raid_god` (character, 493x512): Title screen hero key art
- `logo` (ui, 786x553): the game logo — title/home screen and anywhere the name appears
