#!/usr/bin/env node
/**
 * Downloads Minecraft 1.8.9 item/block textures from the client jar
 * and saves them to public/assets/items/ with names matching Hypixel's
 * material IDs.
 *
 * Usage: node scripts/download-textures.mjs
 */

import { mkdir, writeFile } from 'fs/promises'
import { existsSync, createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import yauzl from 'yauzl'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'items')
const JAR_PATH = join(__dirname, '.cache', 'client-1.21.1.jar')
const VERSION_MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

// ────────────────────────────────────────────────────────────────────
// Durability sub-type mappings
// ────────────────────────────────────────────────────────────────────

const DYE_NAMES = {
  0: 'dye_powder_black', 1: 'dye_powder_red', 2: 'dye_powder_green',
  3: 'dye_powder_brown', 4: 'dye_powder_blue', 5: 'dye_powder_purple',
  6: 'dye_powder_cyan', 7: 'dye_powder_silver', 8: 'dye_powder_gray',
  9: 'dye_powder_pink', 10: 'dye_powder_lime', 11: 'dye_powder_yellow',
  12: 'dye_powder_light_blue', 13: 'dye_powder_magenta',
  14: 'dye_powder_orange', 15: 'dye_powder_white',
}

const WOOL_COLORS = {
  0: 'wool_colored_white', 1: 'wool_colored_orange', 2: 'wool_colored_magenta',
  3: 'wool_colored_light_blue', 4: 'wool_colored_yellow', 5: 'wool_colored_lime',
  6: 'wool_colored_pink', 7: 'wool_colored_gray', 8: 'wool_colored_silver',
  9: 'wool_colored_cyan', 10: 'wool_colored_purple', 11: 'wool_colored_blue',
  12: 'wool_colored_brown', 13: 'wool_colored_green', 14: 'wool_colored_red',
  15: 'wool_colored_black',
}

const LOG_TYPES = { 0: 'log_oak', 1: 'log_spruce', 2: 'log_birch', 3: 'log_jungle' }
const LOG2_TYPES = { 0: 'log_acacia', 1: 'log_big_oak' }
const WOOD_TYPES = { 0: 'planks_oak', 1: 'planks_spruce', 2: 'planks_birch', 3: 'planks_jungle', 4: 'planks_acacia', 5: 'planks_big_oak' }
const SAPLING_TYPES = { 0: 'sapling_oak', 1: 'sapling_spruce', 2: 'sapling_birch', 3: 'sapling_jungle', 4: 'sapling_acacia', 5: 'sapling_roofed_oak' }
const STONE_TYPES = { 0: 'stone', 1: 'stone_granite', 2: 'stone_granite_smooth', 3: 'stone_diorite', 4: 'stone_diorite_smooth', 5: 'stone_andesite', 6: 'stone_andesite_smooth' }
const SAND_TYPES = { 0: 'sand', 1: 'red_sand' }
const SANDSTONE_TYPES = { 0: 'sandstone_normal', 1: 'sandstone_carved', 2: 'sandstone_smooth' }
const RED_SANDSTONE_TYPES = { 0: 'red_sandstone_normal', 1: 'red_sandstone_carved', 2: 'red_sandstone_smooth' }
const DIRT_TYPES = { 0: 'dirt', 1: 'coarse_dirt', 2: 'dirt_podzol_top' }
const SPONGE_TYPES = { 0: 'sponge', 1: 'sponge_wet' }
const PRISMARINE_TYPES = { 0: 'prismarine_rough', 1: 'prismarine_bricks', 2: 'prismarine_dark' }
const DOUBLE_PLANT_TYPES = { 0: 'double_plant_sunflower_front', 1: 'double_plant_syringa_top', 2: 'double_plant_grass_top', 3: 'double_plant_fern_top', 4: 'double_plant_rose_top', 5: 'double_plant_paeonia_top' }
const SKULL_TYPES = { 0: 'skull_skeleton', 1: 'skull_wither', 2: 'skull_zombie', 3: 'skull_char', 4: 'skull_creeper' }
const QUARTZ_TYPES = { 0: 'quartz_block_top', 1: 'quartz_block_chiseled_top', 2: 'quartz_block_lines_top' }
const FISH_TYPES = { 0: 'fish_cod_raw', 1: 'fish_salmon_raw', 2: 'fish_clownfish_raw', 3: 'fish_pufferfish_raw' }
const COOKED_FISH_TYPES = { 0: 'fish_cod_cooked', 1: 'fish_salmon_cooked' }
const COAL_TYPES = { 0: 'coal', 1: 'charcoal' }
const GOLDEN_APPLE_TYPES = { 0: 'apple_golden', 1: 'apple_golden' }
const SMOOTH_BRICK_TYPES = { 0: 'stonebrick_normal', 1: 'stonebrick_mossy', 2: 'stonebrick_cracked', 3: 'stonebrick_carved' }
const STAINED_GLASS_COLORS = Object.fromEntries(
  Object.entries(WOOL_COLORS).map(([k, v]) => [k, v.replace('wool_colored_', 'glass_')])
)
const STAINED_GLASS_PANE_COLORS = Object.fromEntries(
  Object.entries(STAINED_GLASS_COLORS).map(([k, v]) => [k, v.replace('glass_', 'glass_pane_top_')])
)
const STAINED_CLAY_COLORS = Object.fromEntries(
  Object.entries(WOOL_COLORS).map(([k, v]) => [k, v.replace('wool_colored_', 'hardened_clay_stained_')])
)
const CARPET_COLORS = WOOL_COLORS
const STEP_TYPES = { 0: 'stone_slab_top', 1: 'sandstone_normal', 2: 'planks_oak', 3: 'cobblestone', 4: 'brick', 5: 'stonebrick_normal', 6: 'nether_brick', 7: 'quartz_block_top' }
const RED_ROSE_TYPES = { 0: 'flower_rose', 1: 'flower_blue_orchid', 2: 'flower_allium', 3: 'flower_houstonia', 4: 'flower_tulip_red', 5: 'flower_tulip_orange', 6: 'flower_tulip_white', 7: 'flower_tulip_pink', 8: 'flower_oxeye_daisy' }
const BANNER_TYPES = Object.fromEntries(
  Object.entries(WOOL_COLORS).map(([k, v]) => [k, v]) // banners use same base texture approach
)

const DURABILITY_MAP = {
  INK_SACK: DYE_NAMES, WOOL: WOOL_COLORS, STAINED_GLASS: STAINED_GLASS_COLORS,
  STAINED_GLASS_PANE: STAINED_GLASS_PANE_COLORS, STAINED_CLAY: STAINED_CLAY_COLORS,
  CARPET: CARPET_COLORS, LOG: LOG_TYPES, LOG_2: LOG2_TYPES, WOOD: WOOD_TYPES,
  SAPLING: SAPLING_TYPES, STONE: STONE_TYPES, SAND: SAND_TYPES,
  SANDSTONE: SANDSTONE_TYPES, RED_SANDSTONE: RED_SANDSTONE_TYPES,
  DIRT: DIRT_TYPES, SPONGE: SPONGE_TYPES, PRISMARINE: PRISMARINE_TYPES,
  DOUBLE_PLANT: DOUBLE_PLANT_TYPES, SKULL_ITEM: SKULL_TYPES,
  QUARTZ_BLOCK: QUARTZ_TYPES, RAW_FISH: FISH_TYPES, COOKED_FISH: COOKED_FISH_TYPES,
  COAL: COAL_TYPES, GOLDEN_APPLE: GOLDEN_APPLE_TYPES, SMOOTH_BRICK: SMOOTH_BRICK_TYPES,
  STEP: STEP_TYPES, RED_ROSE: RED_ROSE_TYPES,
  WOOD_STEP: WOOD_TYPES,  // wooden slabs use same textures as planks
  BANNER: WOOL_COLORS,    // banners: use wool color as visual proxy
}

// ────────────────────────────────────────────────────────────────────
// Material → jar texture path mapping
// ────────────────────────────────────────────────────────────────────

const BLOCK_MATERIALS = new Set([
  'STONE', 'GRASS', 'DIRT', 'COBBLESTONE', 'WOOD', 'SAPLING', 'BEDROCK',
  'SAND', 'GRAVEL', 'GOLD_ORE', 'IRON_ORE', 'COAL_ORE', 'LOG', 'LOG_2',
  'LEAVES', 'LEAVES_2', 'SPONGE', 'GLASS', 'LAPIS_ORE', 'LAPIS_BLOCK',
  'DISPENSER', 'SANDSTONE', 'NOTE_BLOCK', 'WOOL', 'GOLD_BLOCK', 'IRON_BLOCK',
  'DOUBLE_STEP', 'STEP', 'BRICK', 'TNT', 'BOOKSHELF', 'MOSSY_COBBLESTONE',
  'OBSIDIAN', 'MOB_SPAWNER', 'DIAMOND_ORE', 'DIAMOND_BLOCK', 'WORKBENCH',
  'SOIL', 'FURNACE', 'REDSTONE_ORE', 'ICE', 'SNOW_BLOCK', 'CACTUS',
  'CLAY', 'JUKEBOX', 'FENCE', 'PUMPKIN', 'NETHERRACK', 'SOUL_SAND',
  'GLOWSTONE', 'JACK_O_LANTERN', 'STAINED_GLASS', 'STAINED_GLASS_PANE',
  'SMOOTH_BRICK', 'HUGE_MUSHROOM_1', 'HUGE_MUSHROOM_2', 'MELON_BLOCK',
  'MYCEL', 'NETHER_BRICK', 'ENDER_STONE', 'REDSTONE_LAMP_OFF',
  'EMERALD_ORE', 'EMERALD_BLOCK', 'COMMAND', 'BEACON', 'COBBLE_WALL',
  'QUARTZ_BLOCK', 'QUARTZ_ORE', 'STAINED_CLAY', 'HAY_BLOCK',
  'HARD_CLAY', 'COAL_BLOCK', 'PACKED_ICE', 'DOUBLE_PLANT',
  'RED_SANDSTONE', 'PRISMARINE', 'SEA_LANTERN', 'SLIME_BLOCK',
  'BARRIER', 'CARPET', 'DROPPER', 'HOPPER', 'DAYLIGHT_DETECTOR',
  'REDSTONE_BLOCK', 'NETHER_BRICK_ITEM', 'THIN_GLASS', 'IRON_FENCE',
  'SPRUCE_FENCE', 'BIRCH_FENCE', 'JUNGLE_FENCE', 'ACACIA_FENCE',
  'DARK_OAK_FENCE', 'END_STONE', 'WEB', 'LONG_GRASS', 'DEAD_BUSH',
  'YELLOW_FLOWER', 'RED_ROSE', 'BROWN_MUSHROOM', 'RED_MUSHROOM',
  'TORCH', 'SNOW', 'SUGAR_CANE', 'VINE',
])

const MATERIAL_OVERRIDES = {
  SULPHUR: 'items/gunpowder', RAW_FISH: 'items/fish_cod_raw',
  COOKED_FISH: 'items/fish_cod_cooked', INK_SACK: 'items/dye_powder_black',
  NETHER_STALK: 'items/nether_wart', WATER_LILY: 'blocks/waterlily',
  EXPLOSIVE_MINECART: 'items/minecart_tnt', COMMAND_MINECART: 'items/minecart_command_block',
  WATCH: 'items/clock_00', EMPTY_MAP: 'items/map_empty', FIREWORK: 'items/fireworks',
  FIREWORK_CHARGE: 'items/fireworks_charge', SKULL_ITEM: 'items/skull_char',
  WOOD_SWORD: 'items/wood_sword', WOOD_PICKAXE: 'items/wood_pickaxe',
  WOOD_AXE: 'items/wood_axe', WOOD_SPADE: 'items/wood_shovel',
  WOOD_HOE: 'items/wood_hoe', GOLD_SWORD: 'items/gold_sword',
  GOLD_PICKAXE: 'items/gold_pickaxe', GOLD_AXE: 'items/gold_axe',
  GOLD_SPADE: 'items/gold_shovel', GOLD_HOE: 'items/gold_hoe',
  GOLD_HELMET: 'items/gold_helmet', GOLD_CHESTPLATE: 'items/gold_chestplate',
  GOLD_LEGGINGS: 'items/gold_leggings', GOLD_BOOTS: 'items/gold_boots',
  IRON_SPADE: 'items/iron_shovel', STONE_SPADE: 'items/stone_shovel',
  DIAMOND_SPADE: 'items/diamond_shovel', NETHER_BRICK_ITEM: 'items/netherbrick',
  GOLD_RECORD: 'items/record_13', GREEN_RECORD: 'items/record_cat',
  RECORD_3: 'items/record_blocks', RECORD_4: 'items/record_chirp',
  RECORD_5: 'items/record_far', RECORD_6: 'items/record_mall',
  RECORD_7: 'items/record_mellohi', RECORD_8: 'items/record_stal',
  RECORD_9: 'items/record_strad', RECORD_10: 'items/record_ward',
  RECORD_11: 'items/record_11', RECORD_12: 'items/record_wait',
  WORKBENCH: 'blocks/crafting_table_front', FURNACE: 'blocks/furnace_front_off',
  DISPENSER: 'blocks/dispenser_front_horizontal',
  DROPPER: 'blocks/dropper_front_horizontal', PUMPKIN: 'blocks/pumpkin_face_off',
  JACK_O_LANTERN: 'blocks/pumpkin_face_on', REDSTONE_LAMP_OFF: 'blocks/redstone_lamp_off',
  TNT: 'blocks/tnt_side', BOOKSHELF: 'blocks/bookshelf',
  SMOOTH_BRICK: 'blocks/stonebrick_normal', COBBLE_WALL: 'blocks/cobblestone',
  SOIL: 'blocks/farmland_wet', MYCEL: 'blocks/mycelium_top',
  HAY_BLOCK: 'blocks/hay_block_top', HARD_CLAY: 'blocks/hardened_clay',
  ENDER_STONE: 'blocks/end_stone', CACTUS: 'blocks/cactus_side',
  JUKEBOX: 'blocks/jukebox_top', MOB_SPAWNER: 'blocks/mob_spawner',
  WEB: 'blocks/web', LONG_GRASS: 'blocks/tallgrass', DEAD_BUSH: 'blocks/deadbush',
  YELLOW_FLOWER: 'blocks/flower_dandelion', RED_ROSE: 'blocks/flower_rose',
  BROWN_MUSHROOM: 'blocks/mushroom_brown', RED_MUSHROOM: 'blocks/mushroom_red',
  TORCH: 'blocks/torch_on', SNOW: 'blocks/snow', SUGAR_CANE: 'items/reeds',
  VINE: 'blocks/vine', HUGE_MUSHROOM_1: 'blocks/mushroom_block_skin_brown',
  HUGE_MUSHROOM_2: 'blocks/mushroom_block_skin_red',
  NETHER_BRICK: 'blocks/nether_brick', EYE_OF_ENDER: 'items/ender_eye',
  RAW_BEEF: 'items/beef_raw', COOKED_BEEF: 'items/beef_cooked',
  RAW_CHICKEN: 'items/chicken_raw', COOKED_CHICKEN: 'items/chicken_cooked',
  PORK: 'items/porkchop_raw', GRILLED_PORK: 'items/porkchop_cooked',
  MUTTON: 'items/mutton_raw', COOKED_MUTTON: 'items/mutton_cooked',
  RABBIT: 'items/rabbit_raw', COOKED_RABBIT: 'items/rabbit_cooked',
  MUSHROOM_SOUP: 'items/mushroom_stew', MELON: 'items/melon',
  MELON_BLOCK: 'blocks/melon_side', MELON_SEEDS: 'items/seeds_melon',
  PUMPKIN_SEEDS: 'items/seeds_pumpkin', SEEDS: 'items/seeds_wheat',
  POTATO_ITEM: 'items/potato', BAKED_POTATO: 'items/potato_baked',
  POISONOUS_POTATO: 'items/potato_poisonous', CARROT_ITEM: 'items/carrot',
  GOLDEN_CARROT: 'items/carrot_golden', CARROT_STICK: 'items/carrot_on_a_stick',
  SPECKLED_MELON: 'items/melon_speckled', POTION: 'items/potion_bottle_drinkable',
  GLASS_BOTTLE: 'items/potion_bottle_empty', BREWING_STAND_ITEM: 'items/brewing_stand',
  CAULDRON_ITEM: 'items/cauldron', ENCHANTED_BOOK: 'items/book_enchanted',
  BOOK_AND_QUILL: 'items/book_writable', WRITTEN_BOOK: 'items/book_written',
  FLOWER_POT_ITEM: 'items/flower_pot', MAP: 'items/map_filled',
  LEASH: 'items/lead', BED: 'items/bed',
  REDSTONE_COMPARATOR: 'items/comparator', REDSTONE_TORCH_ON: 'items/redstone_torch_on',
  DIODE: 'items/repeater', MONSTER_EGG: 'items/spawn_egg',
  EXP_BOTTLE: 'items/experience_bottle', BEACON: 'blocks/beacon',
  DAYLIGHT_DETECTOR: 'blocks/daylight_detector_top',
  HOPPER: 'items/hopper', COMMAND: 'blocks/command_block',
  BARRIER: 'items/barrier', SLIME_BLOCK: 'blocks/slime',
  SEA_LANTERN: 'blocks/sea_lantern',
  IRON_BARDING: 'items/iron_horse_armor', GOLD_BARDING: 'items/gold_horse_armor',
  DIAMOND_BARDING: 'items/diamond_horse_armor',
  THIN_GLASS: 'blocks/glass', STAINED_GLASS: 'blocks/glass_white',
  IRON_FENCE: 'blocks/iron_bars',
  FENCE: 'blocks/planks_oak', SPRUCE_FENCE: 'blocks/planks_spruce',
  BIRCH_FENCE: 'blocks/planks_birch', JUNGLE_FENCE: 'blocks/planks_jungle',
  ACACIA_FENCE: 'blocks/planks_acacia', DARK_OAK_FENCE: 'blocks/planks_big_oak',
  COBBLESTONE: 'blocks/cobblestone', MOSSY_COBBLESTONE: 'blocks/cobblestone_mossy',
  GRASS: 'blocks/grass_top', PACKED_ICE: 'blocks/ice_packed',
  ICE: 'blocks/ice', BEDROCK: 'blocks/bedrock', GRAVEL: 'blocks/gravel',
  COAL_BLOCK: 'blocks/coal_block', LAPIS_BLOCK: 'blocks/lapis_block',
  GOLD_BLOCK: 'blocks/gold_block', IRON_BLOCK: 'blocks/iron_block',
  DIAMOND_BLOCK: 'blocks/diamond_block', EMERALD_BLOCK: 'blocks/emerald_block',
  REDSTONE_BLOCK: 'blocks/redstone_block', OBSIDIAN: 'blocks/obsidian',
  GLOWSTONE: 'blocks/glowstone', NETHERRACK: 'blocks/netherrack',
  SOUL_SAND: 'blocks/soul_sand', SNOW_BLOCK: 'blocks/snow',
  CLAY: 'blocks/clay', BRICK: 'blocks/brick', NOTE_BLOCK: 'blocks/noteblock',
  LAPIS_ORE: 'blocks/lapis_ore', COAL_ORE: 'blocks/coal_ore',
  IRON_ORE: 'blocks/iron_ore', GOLD_ORE: 'blocks/gold_ore',
  DIAMOND_ORE: 'blocks/diamond_ore', EMERALD_ORE: 'blocks/emerald_ore',
  REDSTONE_ORE: 'blocks/redstone_ore', QUARTZ_ORE: 'blocks/quartz_ore_side',
  GLASS: 'blocks/glass', DOUBLE_STEP: 'blocks/stone_slab_top',
  STEP: 'blocks/stone_slab_top', END_STONE: 'blocks/end_stone',
  LEAVES: 'blocks/leaves_oak', LEAVES_2: 'blocks/leaves_acacia',
  GOLD_INGOT: 'items/gold_ingot', GOLD_NUGGET: 'items/gold_nugget',
  // item_model
  WRITABLE_BOOK: 'items/book_writable',
  // Additional 1.8→1.21 mappings
  COMPASS: 'items/compass_00',
  IRON_PLATE: 'blocks/iron_trapdoor',
  CLAY_BRICK: 'items/brick',
  CHEST: 'items/chest',  // 1.21 doesn't have this as flat texture
  ENDER_CHEST: 'items/ender_chest',
  SIGN: 'items/oak_sign',
  TRAPPED_CHEST: 'items/trapped_chest',
  LOG: 'blocks/oak_log',
  LOG_2: 'blocks/acacia_log',
  LEAVES: 'blocks/oak_leaves',
  LEAVES_2: 'blocks/acacia_leaves',
  FIREBALL: 'items/fire_charge',
  MELON: 'items/melon_slice',
  SNOW_BALL: 'items/snowball',
  BED: 'items/red_bed',
  REDSTONE_TORCH_ON: 'items/redstone_torch',
  STONE_BUTTON: 'blocks/stone',
  WOOD_BUTTON: 'blocks/oak_planks',
  PISTON_BASE: 'blocks/piston_side',
  PISTON_STICKY_BASE: 'blocks/piston_side',
  // Stairs → use the base block texture
  WOOD_STAIRS: 'blocks/oak_planks', SPRUCE_WOOD_STAIRS: 'blocks/spruce_planks',
  BIRCH_WOOD_STAIRS: 'blocks/birch_planks', JUNGLE_WOOD_STAIRS: 'blocks/jungle_planks',
  ACACIA_STAIRS: 'blocks/acacia_planks', DARK_OAK_STAIRS: 'blocks/dark_oak_planks',
  COBBLESTONE_STAIRS: 'blocks/cobblestone', BRICK_STAIRS: 'blocks/bricks',
  SMOOTH_STAIRS: 'blocks/stone_bricks', NETHER_BRICK_STAIRS: 'blocks/nether_bricks',
  SANDSTONE_STAIRS: 'blocks/sandstone', RED_SANDSTONE_STAIRS: 'blocks/red_sandstone',
  QUARTZ_STAIRS: 'blocks/quartz_block_side', PURPUR_STAIRS: 'blocks/purpur_block',
  // Doors → use door item textures
  WOODEN_DOOR: 'items/oak_door', SPRUCE_DOOR_ITEM: 'items/spruce_door',
  BIRCH_DOOR_ITEM: 'items/birch_door', JUNGLE_DOOR_ITEM: 'items/jungle_door',
  ACACIA_DOOR_ITEM: 'items/acacia_door', DARK_OAK_DOOR_ITEM: 'items/dark_oak_door',
  IRON_DOOR: 'items/iron_door',
  // Fence gates → use planks texture
  FENCE_GATE: 'blocks/oak_planks', SPRUCE_FENCE_GATE: 'blocks/spruce_planks',
  BIRCH_FENCE_GATE: 'blocks/birch_planks', JUNGLE_FENCE_GATE: 'blocks/jungle_planks',
  ACACIA_FENCE_GATE: 'blocks/acacia_planks', DARK_OAK_FENCE_GATE: 'blocks/dark_oak_planks',
  // Stained glass panes → use the stained glass texture
  STAINED_GLASS_PANE: 'blocks/white_stained_glass',
  DOUBLE_PLANT: 'blocks/sunflower_front',
  SKULL_ITEM: 'items/skeleton_skull',
  RED_ROSE: 'blocks/poppy',
  GOLD_PLATE: 'items/light_weighted_pressure_plate',
  IRON_DOOR_BLOCK: 'items/iron_door',
  TRAP_DOOR: 'blocks/oak_trapdoor',
  IRON_TRAPDOOR: 'blocks/iron_trapdoor',
  TRIPWIRE_HOOK: 'blocks/tripwire_hook',
  LEVER: 'blocks/lever',
  STORAGE_MINECART: 'items/chest_minecart',
  POWERED_MINECART: 'items/furnace_minecart',
  HOPPER_MINECART: 'items/hopper_minecart',
  BOAT: 'items/oak_boat', BOAT_SPRUCE: 'items/spruce_boat',
  BOAT_BIRCH: 'items/birch_boat', BOAT_JUNGLE: 'items/jungle_boat',
  BOAT_ACACIA: 'items/acacia_boat', BOAT_DARK_OAK: 'items/dark_oak_boat',
  WOOD_DOOR: 'items/oak_door',
  SAPLING: 'blocks/oak_sapling',
  CARPET: 'blocks/white_wool',
  WOOL: 'blocks/white_wool',
  STAINED_CLAY: 'blocks/white_terracotta',
  RAILS: 'blocks/rail',
  NETHER_FENCE: 'blocks/nether_bricks',
  ENCHANTMENT_TABLE: 'blocks/enchanting_table_top',
  QUARTZ_BLOCK: 'blocks/quartz_block_top',
  GOLD_PLATE: 'blocks/gold_block',
  WOOD_STEP: 'blocks/oak_planks',
  BED: 'blocks/red_wool',
  REDSTONE_TORCH_ON: 'blocks/redstone_torch',
  // Banners → use the wool color as approximation
  BANNER: 'blocks/white_wool',
  STONE_PLATE: 'blocks/stone',
  WOOD_PLATE: 'blocks/oak_planks',
  ENDER_PORTAL_FRAME: 'blocks/end_portal_frame_top',
}

// ────────────────────────────────────────────────────────────────────
// JAR extraction
// ────────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json()
}

async function downloadJar() {
  if (existsSync(JAR_PATH)) {
    console.log('Using cached client jar')
    return
  }

  console.log('Fetching Mojang version manifest...')
  const manifest = await fetchJson(VERSION_MANIFEST)
  const target = manifest.versions.find(v => v.id === '1.21.1')
  if (!target) throw new Error('1.21.1 not found')

  const versionInfo = await fetchJson(target.url)
  const clientUrl = versionInfo.downloads.client.url
  console.log(`Downloading 1.21.1 client jar...`)

  await mkdir(dirname(JAR_PATH), { recursive: true })
  const res = await fetch(clientUrl)
  if (!res.ok) throw new Error(`Failed to download jar: ${res.status}`)
  const ws = createWriteStream(JAR_PATH)
  await pipeline(res.body, ws)
  console.log('Jar downloaded.')
}

/** Extract all matching texture files from the jar in a single pass */
function extractTexturesFromJar(jarPath, wantedPaths) {
  return new Promise((resolve, reject) => {
    const results = new Map() // path → Buffer
    const wanted = new Set(wantedPaths)

    yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)

      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (wanted.has(entry.fileName)) {
          zipfile.openReadStream(entry, (err2, stream) => {
            if (err2) return reject(err2)
            const chunks = []
            stream.on('data', (chunk) => chunks.push(chunk))
            stream.on('end', () => {
              results.set(entry.fileName, Buffer.concat(chunks))
              wanted.delete(entry.fileName)
              zipfile.readEntry()
            })
          })
        } else {
          zipfile.readEntry()
        }
      })
      zipfile.on('end', () => resolve(results))
      zipfile.on('error', reject)
    })
  })
}

/** Index all texture paths in the jar */
function indexJarTextures(jarPath) {
  return new Promise((resolve, reject) => {
    const paths = []
    yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)
      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        if (entry.fileName.startsWith('assets/minecraft/textures/') && entry.fileName.endsWith('.png')) {
          paths.push(entry.fileName)
        }
        zipfile.readEntry()
      })
      zipfile.on('end', () => resolve(paths))
      zipfile.on('error', reject)
    })
  })
}

// ────────────────────────────────────────────────────────────────────
// 1.8 → 1.13+ name migration (the "flattening")
// ────────────────────────────────────────────────────────────────────

const LEGACY_TO_MODERN_ITEMS = {
  wood_sword: 'wooden_sword', wood_pickaxe: 'wooden_pickaxe',
  wood_axe: 'wooden_axe', wood_shovel: 'wooden_shovel', wood_hoe: 'wooden_hoe',
  gold_sword: 'golden_sword', gold_pickaxe: 'golden_pickaxe',
  gold_axe: 'golden_axe', gold_shovel: 'golden_shovel', gold_hoe: 'golden_hoe',
  gold_helmet: 'golden_helmet', gold_chestplate: 'golden_chestplate',
  gold_leggings: 'golden_leggings', gold_boots: 'golden_boots',
  gold_ingot: 'gold_ingot', gold_nugget: 'gold_nugget',
  gold_horse_armor: 'golden_horse_armor',
  iron_horse_armor: 'iron_horse_armor', diamond_horse_armor: 'diamond_horse_armor',
  iron_shovel: 'iron_shovel', stone_shovel: 'stone_shovel', diamond_shovel: 'diamond_shovel',
  clock_00: 'clock', compass_00: 'compass',
  map_empty: 'map', map_filled: 'filled_map',
  reeds: 'sugar_cane', nether_wart: 'nether_wart',
  fish_cod_raw: 'cod', fish_cod_cooked: 'cooked_cod',
  fish_salmon_raw: 'salmon', fish_salmon_cooked: 'cooked_salmon',
  fish_clownfish_raw: 'tropical_fish', fish_pufferfish_raw: 'pufferfish',
  beef_raw: 'beef', beef_cooked: 'cooked_beef',
  chicken_raw: 'chicken', chicken_cooked: 'cooked_chicken',
  porkchop_raw: 'porkchop', porkchop_cooked: 'cooked_porkchop',
  mutton_raw: 'mutton', mutton_cooked: 'cooked_mutton',
  rabbit_raw: 'rabbit', rabbit_cooked: 'cooked_rabbit',
  mushroom_stew: 'mushroom_stew', potato_baked: 'baked_potato',
  potato_poisonous: 'poisonous_potato',
  carrot_on_a_stick: 'carrot_on_a_stick', carrot_golden: 'golden_carrot',
  melon_speckled: 'glistering_melon_slice',
  apple_golden: 'golden_apple', apple: 'apple',
  gunpowder: 'gunpowder',
  skull_char: 'player_head', skull_skeleton: 'skeleton_skull',
  skull_wither: 'wither_skeleton_skull', skull_zombie: 'zombie_head',
  skull_creeper: 'creeper_head',
  ender_eye: 'ender_eye', ender_pearl: 'ender_pearl',
  fireworks: 'firework_rocket', fireworks_charge: 'firework_star',
  spawn_egg: 'pig_spawn_egg',
  netherbrick: 'nether_brick',
  brewing_stand: 'brewing_stand', cauldron: 'cauldron',
  book_enchanted: 'enchanted_book', book_writable: 'writable_book',
  book_written: 'written_book',
  experience_bottle: 'experience_bottle',
  potion_bottle_drinkable: 'potion', potion_bottle_empty: 'glass_bottle',
  minecart_tnt: 'tnt_minecart', minecart_command_block: 'command_block_minecart',
  comparator: 'comparator', repeater: 'repeater',
  redstone_torch_on: 'redstone_torch',
  flower_pot: 'flower_pot', lead: 'lead', bed: 'red_bed',
  record_13: 'music_disc_13', record_cat: 'music_disc_cat',
  record_blocks: 'music_disc_blocks', record_chirp: 'music_disc_chirp',
  record_far: 'music_disc_far', record_mall: 'music_disc_mall',
  record_mellohi: 'music_disc_mellohi', record_stal: 'music_disc_stal',
  record_strad: 'music_disc_strad', record_ward: 'music_disc_ward',
  record_11: 'music_disc_11', record_wait: 'music_disc_wait',
  seeds_wheat: 'wheat_seeds', seeds_melon: 'melon_seeds', seeds_pumpkin: 'pumpkin_seeds',
  // Dyes (1.8 → 1.14+ individual dye items)
  dye_powder_black: 'ink_sac', dye_powder_red: 'red_dye',
  dye_powder_green: 'green_dye', dye_powder_brown: 'cocoa_beans',
  dye_powder_blue: 'lapis_lazuli', dye_powder_purple: 'purple_dye',
  dye_powder_cyan: 'cyan_dye', dye_powder_silver: 'light_gray_dye',
  dye_powder_gray: 'gray_dye', dye_powder_pink: 'pink_dye',
  dye_powder_lime: 'lime_dye', dye_powder_yellow: 'yellow_dye',
  dye_powder_light_blue: 'light_blue_dye', dye_powder_magenta: 'magenta_dye',
  dye_powder_orange: 'orange_dye', dye_powder_white: 'bone_meal',
  charcoal: 'charcoal', coal: 'coal',
}

const LEGACY_TO_MODERN_BLOCKS = {
  // Wool → colored wool
  wool_colored_white: 'white_wool', wool_colored_orange: 'orange_wool',
  wool_colored_magenta: 'magenta_wool', wool_colored_light_blue: 'light_blue_wool',
  wool_colored_yellow: 'yellow_wool', wool_colored_lime: 'lime_wool',
  wool_colored_pink: 'pink_wool', wool_colored_gray: 'gray_wool',
  wool_colored_silver: 'light_gray_wool', wool_colored_cyan: 'cyan_wool',
  wool_colored_purple: 'purple_wool', wool_colored_blue: 'blue_wool',
  wool_colored_brown: 'brown_wool', wool_colored_green: 'green_wool',
  wool_colored_red: 'red_wool', wool_colored_black: 'black_wool',
  // Stained glass
  glass_white: 'white_stained_glass', glass_orange: 'orange_stained_glass',
  glass_magenta: 'magenta_stained_glass', glass_light_blue: 'light_blue_stained_glass',
  glass_yellow: 'yellow_stained_glass', glass_lime: 'lime_stained_glass',
  glass_pink: 'pink_stained_glass', glass_gray: 'gray_stained_glass',
  glass_silver: 'light_gray_stained_glass', glass_cyan: 'cyan_stained_glass',
  glass_purple: 'purple_stained_glass', glass_blue: 'blue_stained_glass',
  glass_brown: 'brown_stained_glass', glass_green: 'green_stained_glass',
  glass_red: 'red_stained_glass', glass_black: 'black_stained_glass',
  // Stained glass pane
  glass_pane_top_white: 'white_stained_glass_pane_top', glass_pane_top_orange: 'orange_stained_glass_pane_top',
  // Stained clay → terracotta
  hardened_clay_stained_white: 'white_terracotta', hardened_clay_stained_orange: 'orange_terracotta',
  hardened_clay_stained_magenta: 'magenta_terracotta', hardened_clay_stained_light_blue: 'light_blue_terracotta',
  hardened_clay_stained_yellow: 'yellow_terracotta', hardened_clay_stained_lime: 'lime_terracotta',
  hardened_clay_stained_pink: 'pink_terracotta', hardened_clay_stained_gray: 'gray_terracotta',
  hardened_clay_stained_silver: 'light_gray_terracotta', hardened_clay_stained_cyan: 'cyan_terracotta',
  hardened_clay_stained_purple: 'purple_terracotta', hardened_clay_stained_blue: 'blue_terracotta',
  hardened_clay_stained_brown: 'brown_terracotta', hardened_clay_stained_green: 'green_terracotta',
  hardened_clay_stained_red: 'red_terracotta', hardened_clay_stained_black: 'black_terracotta',
  hardened_clay: 'terracotta',
  // Logs
  log_oak: 'oak_log', log_spruce: 'spruce_log', log_birch: 'birch_log', log_jungle: 'jungle_log',
  log_acacia: 'acacia_log', log_big_oak: 'dark_oak_log',
  // Planks
  planks_oak: 'oak_planks', planks_spruce: 'spruce_planks', planks_birch: 'birch_planks',
  planks_jungle: 'jungle_planks', planks_acacia: 'acacia_planks', planks_big_oak: 'dark_oak_planks',
  // Saplings
  sapling_oak: 'oak_sapling', sapling_spruce: 'spruce_sapling', sapling_birch: 'birch_sapling',
  sapling_jungle: 'jungle_sapling', sapling_acacia: 'acacia_sapling', sapling_roofed_oak: 'dark_oak_sapling',
  // Stone variants
  stone_granite: 'granite', stone_granite_smooth: 'polished_granite',
  stone_diorite: 'diorite', stone_diorite_smooth: 'polished_diorite',
  stone_andesite: 'andesite', stone_andesite_smooth: 'polished_andesite',
  // Sandstone
  sandstone_normal: 'sandstone', sandstone_carved: 'chiseled_sandstone', sandstone_smooth: 'cut_sandstone',
  red_sandstone_normal: 'red_sandstone', red_sandstone_carved: 'chiseled_red_sandstone', red_sandstone_smooth: 'cut_red_sandstone',
  // Other blocks
  red_sand: 'red_sand', coarse_dirt: 'coarse_dirt', dirt_podzol_top: 'podzol_top',
  sponge_wet: 'wet_sponge',
  prismarine_rough: 'prismarine', prismarine_bricks: 'prismarine_bricks', prismarine_dark: 'dark_prismarine',
  stonebrick_normal: 'stone_bricks', stonebrick_mossy: 'mossy_stone_bricks',
  stonebrick_cracked: 'cracked_stone_bricks', stonebrick_carved: 'chiseled_stone_bricks',
  quartz_block_top: 'quartz_block_top', quartz_block_chiseled_top: 'chiseled_quartz_block_top',
  quartz_block_lines_top: 'quartz_pillar_top',
  cobblestone_mossy: 'mossy_cobblestone',
  nether_brick: 'nether_bricks', ice_packed: 'packed_ice',
  farmland_wet: 'farmland', mycelium_top: 'mycelium_top',
  hay_block_top: 'hay_block_top', end_stone: 'end_stone',
  crafting_table_front: 'crafting_table_front', furnace_front_off: 'furnace_front',
  dispenser_front_horizontal: 'dispenser_front', dropper_front_horizontal: 'dropper_front',
  pumpkin_face_off: 'pumpkin_side', pumpkin_face_on: 'jack_o_lantern',
  redstone_lamp_off: 'redstone_lamp', tnt_side: 'tnt_side',
  mob_spawner: 'spawner', torch_on: 'torch',
  flower_dandelion: 'dandelion', flower_rose: 'poppy',
  flower_blue_orchid: 'blue_orchid', flower_allium: 'allium',
  flower_houstonia: 'azure_bluet',
  flower_tulip_red: 'red_tulip', flower_tulip_orange: 'orange_tulip',
  flower_tulip_white: 'white_tulip', flower_tulip_pink: 'pink_tulip',
  flower_oxeye_daisy: 'oxeye_daisy',
  tallgrass: 'short_grass', deadbush: 'dead_bush',
  mushroom_block_skin_brown: 'brown_mushroom_block',
  mushroom_block_skin_red: 'red_mushroom_block',
  noteblock: 'note_block', quartz_ore_side: 'nether_quartz_ore',
  waterlily: 'lily_pad', web: 'cobweb',
  daylight_detector_top: 'daylight_detector_top',
  command_block: 'command_block_front', slime: 'slime_block',
  iron_bars: 'iron_bars',
  // Stained glass panes → just use the glass block texture
  glass_pane_top_white: 'white_stained_glass', glass_pane_top_orange: 'orange_stained_glass',
  glass_pane_top_magenta: 'magenta_stained_glass', glass_pane_top_light_blue: 'light_blue_stained_glass',
  glass_pane_top_yellow: 'yellow_stained_glass', glass_pane_top_lime: 'lime_stained_glass',
  glass_pane_top_pink: 'pink_stained_glass', glass_pane_top_gray: 'gray_stained_glass',
  glass_pane_top_silver: 'light_gray_stained_glass', glass_pane_top_cyan: 'cyan_stained_glass',
  glass_pane_top_purple: 'purple_stained_glass', glass_pane_top_blue: 'blue_stained_glass',
  glass_pane_top_brown: 'brown_stained_glass', glass_pane_top_green: 'green_stained_glass',
  glass_pane_top_red: 'red_stained_glass', glass_pane_top_black: 'black_stained_glass',
  brick: 'bricks',
  stone_slab_top: 'smooth_stone',
  double_plant_sunflower_front: 'sunflower_front',
  double_plant_rose_top: 'rose_bush_top',
  double_plant_syringa_top: 'lilac_top',
  double_plant_paeonia_top: 'peony_top',
  double_plant_grass_top: 'tall_grass_top',
  double_plant_fern_top: 'large_fern_top',
  leaves_oak: 'oak_leaves', leaves_acacia: 'acacia_leaves',
  grass_top: 'grass_block_top',
}

/** Generate all candidate jar paths for a material+durability combo.
 *  Tries both 1.8-style (items/blocks) and 1.13+ style (item/block) paths. */
function candidateJarPaths(material, durability) {
  const candidates = []

  // Check durability sub-type mapping
  if (durability != null && DURABILITY_MAP[material]) {
    const texName = DURABILITY_MAP[material][durability]
    if (texName) {
      const isBlock = BLOCK_MATERIALS.has(material)
      const dirs = isBlock ? ['block', 'blocks'] : ['item', 'items']
      for (const d of dirs) candidates.push(`assets/minecraft/textures/${d}/${texName}.png`)
    }
  }

  // Check override map
  const override = MATERIAL_OVERRIDES[material]
  if (override) {
    // override is like 'items/foo' or 'blocks/foo'
    candidates.push(`assets/minecraft/textures/${override}.png`)
    // Also try singular form (1.13+)
    const singular = override.replace(/^items\//, 'item/').replace(/^blocks\//, 'block/')
    if (singular !== override) candidates.push(`assets/minecraft/textures/${singular}.png`)
  }

  // Default: lowercase name in all 4 directories
  const name = material.toLowerCase()
  for (const d of ['item', 'items', 'block', 'blocks']) {
    candidates.push(`assets/minecraft/textures/${d}/${name}.png`)
  }

  // Also try modern (1.13+) name remappings for all candidates collected so far
  const modernCandidates = []
  for (const c of candidates) {
    const basename = c.split('/').pop()?.replace('.png', '') ?? ''
    const modernItem = LEGACY_TO_MODERN_ITEMS[basename]
    const modernBlock = LEGACY_TO_MODERN_BLOCKS[basename]
    if (modernItem) {
      modernCandidates.push(`assets/minecraft/textures/item/${modernItem}.png`)
    }
    if (modernBlock) {
      modernCandidates.push(`assets/minecraft/textures/block/${modernBlock}.png`)
    }
  }

  return [...candidates, ...modernCandidates]
}

// ────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  await downloadJar()

  console.log('Indexing jar textures...')
  const jarTextureList = await indexJarTextures(JAR_PATH)
  const jarIndex = new Set(jarTextureList)
  console.log(`Found ${jarIndex.size} texture files in jar`)

  // Get materials from API
  let materials = []
  const apiBase = process.env.VITE_API_BASE_URL || process.env.API_URL || 'http://localhost:3000'
  try {
    console.log(`Fetching texture map from API (${apiBase})...`)
    const resp = await fetchJson(`${apiBase}/v2/skyblock/items/textures`)
    const textureMap = resp.data || resp

    for (const [, tex] of Object.entries(textureMap)) {
      if (tex.type === 'vanilla' || tex.type === 'item_model') {
        const mat = tex.type === 'item_model'
          ? tex.item_model.replace(/^minecraft:/, '').toUpperCase()
          : tex.material
        const dur = tex.durability
        const key = dur != null && dur > 0 ? `${mat}:${dur}` : mat
        materials.push({ key, material: mat, durability: dur, itemModel: tex.item_model })
      }
    }

    const seen = new Set()
    materials = materials.filter(m => {
      if (seen.has(m.key)) return false
      seen.add(m.key)
      return true
    })

    console.log(`${materials.length} unique sprite keys from API`)
  } catch (err) {
    console.error(`Could not fetch from API: ${err.message}`)
    process.exit(1)
  }

  // Phase 1: resolve each material to a jar path and output filename
  const tasks = [] // { outName, outPath, jarPath, key }
  let skipped = 0

  for (const { key, material, durability, itemModel } of materials) {
    let outName
    if (itemModel) {
      outName = itemModel.replace(/^minecraft:/, '')
    } else if (durability != null && durability > 0) {
      outName = `${material.toLowerCase()}_${durability}`
    } else {
      outName = material.toLowerCase()
    }

    const outPath = join(OUT_DIR, `${outName}.png`)
    if (existsSync(outPath)) { skipped++; continue }

    // Find the first candidate path that exists in the jar
    const candidates = candidateJarPaths(material, durability)
    let jarPath = null
    for (const p of candidates) {
      if (jarIndex.has(p)) { jarPath = p; break }
    }

    // Fuzzy match by basename
    if (!jarPath) {
      const needle = material.toLowerCase()
      for (const entry of jarIndex) {
        const basename = entry.split('/').pop()?.replace('.png', '') ?? ''
        if (basename === needle) { jarPath = entry; break }
      }
    }

    tasks.push({ outName, outPath, jarPath, key })
  }

  // Phase 2: extract all found textures in one jar pass
  const wantedPaths = tasks.filter(t => t.jarPath).map(t => t.jarPath)
  console.log(`\nExtracting ${wantedPaths.length} textures from jar (${tasks.length - wantedPaths.length + tasks.filter(t=>!t.jarPath).length} not found)...\n`)

  const extracted = await extractTexturesFromJar(JAR_PATH, wantedPaths)
  console.log(`Extracted ${extracted.size} files from jar`)

  // Phase 3: write to disk
  let written = 0
  let failed = 0
  const failures = []

  for (const task of tasks) {
    if (!task.jarPath) {
      failed++
      failures.push(task.key)
      continue
    }

    const data = extracted.get(task.jarPath)
    if (data) {
      await writeFile(task.outPath, data)
      written++
    } else {
      failed++
      failures.push(task.key)
    }
  }

  console.log(`\nDone! ${written} written, ${skipped} skipped (exist), ${failed} not found.`)
  if (failures.length > 0) {
    console.log(`\nMissing (${failures.length}):`)
    for (const f of failures.slice(0, 40)) console.log(`  - ${f}`)
    if (failures.length > 40) console.log(`  ... and ${failures.length - 40} more`)
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
