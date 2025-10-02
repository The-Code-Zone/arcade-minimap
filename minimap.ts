enum MinimapScale {
    Original,
    Half,
    Quarter,
    Eighth,
    Sixteenth
}
enum MinimapSpriteScale {
    MinimapScale,
    Double,
    Quadruple,
    Octuple
}

let MiniMapKind = SpriteKind.create()

//% color=#cfab0c icon="\uf278"
//% groups='["Minimap", "Sprites"]'
namespace minimap {
    export interface Minimap {
        image: Image;
        scale: MinimapScale;
        borderWidth: number;
        borderColor: number;
    }

    interface IUpdateSprite {
        sprite: Sprite;
        scale: MinimapSpriteScale
    }

    let minimapSprite: Sprite;
    let spritesToUpdate: IUpdateSprite[] = []

    function renderScaledImage(source: Image, destination: Image, x: number, y: number, scale: MinimapScale) {
        const tile = source
        for (let i = 0; i < source.width; i += 1 << scale) {
            for (let j = 0; j < source.height; j += 1 << scale) {
                if (source.getPixel(i, j) != 0) {
                    destination.setPixel(x + (i >> scale), y + (j >> scale), source.getPixel(i, j))
                }
            }
        }
    }

    //% block="get minimap object || %scale scale with border $borderWidth $borderColor"
    //% blockId="getMinimapObject"
    //% expandableArgumentMode="toggle"
    //% scale.defl=MinimapScale.Half
    //% borderWidth.defl=2
    //% borderColor.shadow=colorindexpicker
    //% blockSetVariable=my_minimap
    //% group="Minimap" weight=100 blockGap=8
    export function getMinimapObject(scale: MinimapScale = MinimapScale.Half, borderWidth = 0, borderColor = 0): Minimap {
        const tilemap = game.currentScene().tileMap;

        if (!tilemap) {
            return {
                image: image.create(1, 1),
                scale,
                borderWidth,
                borderColor
            }
        }

        const numRows = tilemap.areaHeight() >> tilemap.scale
        const numCols = tilemap.areaWidth() >> tilemap.scale
        const tileWidth = 1 << tilemap.scale

        const minimap: Image = image.create(
            (numCols * tileWidth >> scale) + borderWidth * 2, 
            (numRows * tileWidth >> scale) + borderWidth * 2)

        if (borderWidth > 0)
            minimap.fill(borderColor)

        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                const idx = tilemap.getTileIndex(c, r)
                const tile = tilemap.getTileImage(idx)
                const nx = (c * tileWidth >> scale) + borderWidth
                const ny = (r * tileWidth >> scale) + borderWidth
                renderScaledImage(tile, minimap, nx, ny, scale);
            }
        }
        
        return {
            image: minimap,
            scale: scale,
            borderWidth,
            borderColor
        }
    }

    //% block="$minimap image"
    //% blockId="getImage"
    //% minimap.defl=my_minimap
    //% minimap.shadow=variables_get    
    //% group="Minimap"
    //% weight=90
    export function getImage(minimap: Minimap): Image {
        return minimap.image
    }

    //% block="draw $sprite on $minimap || at $spriteScale scale"
    //% blockId="includeSprite"
    //% minimap.shadow=variables_get
    //% minimap.defl=my_minimap
    //% sprite.shadow=variables_get
    //% sprite.defl=my_sprite
    //% group="Sprites" 
    //% weight=80
    export function includeSprite(minimap: Minimap, sprite: Sprite, spriteScale = MinimapSpriteScale.MinimapScale) {
        const scale = Math.max(minimap.scale - spriteScale, 0)
        const x = (sprite.x >> minimap.scale) - ((sprite.width / 2) >> scale) + minimap.borderWidth
        const y = (sprite.y >> minimap.scale) - ((sprite.height / 2) >> scale) + minimap.borderWidth
        renderScaledImage(sprite.image, minimap.image, x, y, scale);
    }

    //% block="create minimap sprite size $scale || and border $borderwidth $borderColor"
    //% blockId="createMinimapSprite"
    //% group="Minimap"
    //% weight=70
    export function createMinimapSprite(scale: MinimapScale = MinimapScale.Half, borderWidth = 0, borderColor = 0): Sprite {
        let minimap = getMinimapObject(scale, borderWidth, borderColor);
        minimapSprite = sprites.create(minimap.image, MiniMapKind);
        minimapSprite.data = minimap;
        return minimapSprite;
    }

    //% block="add $sprite to update list || at size $spriteScale"
    //% blockId="addSpriteToUpdateList"
    //% sprite.defl=my_sprite
    //% sprite.shadow=variables_get
    //% group="Sprites"
    //% weight=70
    export function addSpriteToUpdateList(sprite: Sprite, spriteScale = MinimapSpriteScale.MinimapScale): void {
        let updateSprite: IUpdateSprite = {sprite: sprite, scale: spriteScale};
        spritesToUpdate.push(updateSprite);
    }

    //% block="remove $sprite from update list"
    //% blockId="removeSpriteFromUpdateList"
    //% sprite.defl=my_sprite
    //% sprite.shadow=variables_get
    //% group="Sprites"
    //% weight=65
    export function removeSpriteFromUpdateList(sprite: Sprite): void {
        spritesToUpdate = spritesToUpdate.filter(u => u.sprite !== sprite);
    }

    function isDestroyed(sprite: Sprite): boolean {
        return !sprite || !!(sprite.flags & sprites.Flag.Destroyed);
    }

    //% block="update minimap every $updateInterval ms"
    //% blockId="updateMiniMapEvery"
    //% group="Sprites"
    //% weight=60
    export function updateMiniMapEvery(updateInterval: number): void {
        game.onUpdateInterval(updateInterval, () => {
            let oldMM = minimapSprite.data;
            let newMM = getMinimapObject(oldMM.scale, oldMM.borderWidth, oldMM.borderColor);
            minimapSprite.data = newMM;
            for (let updateSprite of spritesToUpdate.slice()) { 
                if (!isDestroyed(updateSprite.sprite)) {
                    includeSprite(minimapSprite.data, updateSprite.sprite, updateSprite.scale);
                }
                else {
                    removeSpriteFromUpdateList(updateSprite.sprite);
                }
            }
            minimapSprite.setImage(newMM.image);
        })
    }

} 