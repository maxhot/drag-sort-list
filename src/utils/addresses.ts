import invar from "tiny-invariant"


// TODO: move entire subtree
// TODO: don't let any parent move into its own subtree (no direct ancestor moves)

export type Address = {
   strAddress: string,
   numAddress: number[],
}
export type DropType = 'child' | 'sibling'

export type Item = {
   label?: string,
   address: string,
   numAddress: number[],
   itemKey: string,
   isDropZone?: boolean
}

export class SlipboxFiles {
   private _items: Item[] = []
   constructor(filenames: string[]) {
      const start = Date.now()
      const addresses: Address[] = generateRandomSortedAddresses(filenames.length)
      this._items = filenames.map((label, i) => (
         {
            label: filenames[i],
            address: addresses[i].strAddress,
            numAddress: addresses[i].numAddress,
            itemKey: "" + i,
         }
      ))
      const end = Date.now()
      console.log(`generated ${filenames.length} random addresses in ${end - start}ms`)

      // TODO: build Map<itemKey, item> for O(1) lookup
   }

   getItems(): Item[] { return this._items }

   getItem(itemKey: string): Item | undefined {
      return this._items.find(item => item.itemKey === itemKey)
   }
   getItemIndex(itemKey: string): number {
      return this._items.findIndex(item => item.itemKey === itemKey)
   }

   // a more elegant alternative to canDrop()
   getDropZoneItems(hoverItemKey: string): Item[] {
      const ret: Item[] = []
      return ret;
      // TODO
   }

   // TODO:
   moveSubTree(itemKey: string, anchorItemKey: string, dropItem: Item): void {

   }

   moveItem(itemKey: string, anchorItemKey: string, dropItem: Item): void {
      console.log("Moving item: ", itemKey, "to after: ", anchorItemKey)
      const startIdx = this.getItemIndex(itemKey)
      // endIdx = location to insert in CURRENT array
      const endIdx = this.getItemIndex(anchorItemKey) + 1
      console.log("Moving idx: ", startIdx, "to after: ", endIdx, dropItem.numAddress)

      const newItem: Item = {
         ...dropItem,
         itemKey: itemKey, // use original item key to help AnimatePresence
         // isDropZone: false,
      }
      delete newItem.isDropZone

      console.log("New Item: ", newItem)

      const $ = this._items
      if (startIdx < endIdx) {
         // [ slice1,{startIdx}, slice2, {endIdx}, slice3 ]
         this._items = [
            ...$.slice(0, startIdx), // slice1
            ...$.slice(startIdx + 1, endIdx), // slice2
            newItem,
            ...$.slice(endIdx) // slice3
         ]
      } else if (endIdx < startIdx) {
         // [ slice1,{endIdx}, slice2, {startIdx}, slice3 ]
         this._items = [
            ...$.slice(0, endIdx), // slice1
            newItem,
            ...$.slice(endIdx, startIdx), // slice2
            ...$.slice(startIdx + 1) // slice3
         ]
      } else { // moving to same point on the list: [ slice1, {item}, slice2 ]
         this._items = [
            ...$.slice(0, startIdx),
            newItem,
            ...$.slice(startIdx + 1)
         ]
      }
      console.log("New Item List: ", this._items)
   }

   // TODO: rename to getValidDropZoneItems()...which can check for available ancestor siblings on top of child and sibling (by diffing numAddress and nextItem.numAddress)
   canDrop(dropType: DropType, itemKey: string): boolean {
      const itemIdx = this.getItemIndex(itemKey)
      invar(itemIdx !== -1, "This item should exist!")

      const thisItem = this._items[itemIdx]
      const nextItem = this._items[itemIdx + 1]

      if (!nextItem) return true // not found => thisItem is already last 
      if (
         // if next child is already there, neither sibling nor child dropzones can be dropped here
         // dropType === 'child' &&
         stringifyNumAddr(nextItem.numAddress) === stringifyNumAddr([...thisItem.numAddress, 1])
      ) {
         return false
      }
      // no existing child (can return true if dropType === 'child')
      if (dropType === 'sibling') {
         const siblingNumAddr = [...thisItem.numAddress]
         siblingNumAddr[siblingNumAddr.length - 1] += 1
         // next sibling is already there
         if (stringifyNumAddr(siblingNumAddr) === stringifyNumAddr(nextItem.numAddress)) {
            return false
         }
      }
      return true
   }

}

function generateRandomSortedAddresses(length: number): Address[] {
   const nAddrs: number[][] = [] // easier to work with
   const sAddrs: string[] = []  // we return this
   const addresses: Address[] = []

   for (let i = 0; i < length; i++) {
      let nextAddr = null
      if (i === 0) {
         nextAddr = [1] // first address
      } else {
         const lastNAddr: number[] = nAddrs[i - 1] //e.g. [1,3,12]
         nextAddr = [...lastNAddr]
         let step: Step = randomStep()
         while (step === 'parent') {
            if (nextAddr.length > 1) {
               nextAddr.pop()
            }
            step = randomStep(['parent', 'sibling']) // can't go child because that would backtrack
         }
         if (step === 'child') { // e.g. [1,3,12,1]
            nextAddr.push(1) // new child
         } else if (step === 'sibling') { // eg [1,3,13]
            nextAddr[nextAddr.length - 1] += 1 // sibling
         } else {
            invar(false, "This cannot be!")
         }
      }
      nAddrs.push(nextAddr!)
      sAddrs.push(stringifyNumAddr(nextAddr!))
      addresses.push({
         strAddress: stringifyNumAddr(nextAddr!),
         numAddress: nextAddr!
      })
   }
   return addresses
}

type Step = 'child' | 'parent' | 'sibling'

// presets
const deep = ['parent', 'child', 'child', 'child', 'sibling']
const wide: Step[] = ['parent', 'child', 'child', 'sibling', 'sibling', 'sibling', 'sibling', 'sibling']
const deepANDwide: Step[] = ['parent', 'child', 'child', 'child', 'sibling', 'sibling', 'sibling']
const preset = wide

function randomStep(options = preset): Step {
   const step = (options as Step[])[Math.floor(Math.random() * options.length)]
   return step
}

export function stringifyNumAddr(addrAsNum: number[]) {
   let addrString = ""
   let nextNumber = true
   addrAsNum.forEach(num => {
      if (nextNumber) {
         addrString += num // converts 3 to "3"
      } else {
         while (num >= 26) {
            num -= 26
            addrString += "z"
         }
         addrString += '_abcdefghijklmnopqrstuvwxyz'[num]
      }
      nextNumber = !nextNumber
   })
   return addrString
}
export default generateRandomSortedAddresses