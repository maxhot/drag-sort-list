import invar from "tiny-invariant"


// TODO: disallow parents dropping into children (no moving into own subtree)
// TODO: expose all drop zones, not just child and sibling (e.g. parent-sibling, grandparent sibling, etc)

export type Address = {
   strAddress: string,
   numAddress: number[],
}
export type DropType = 'child' | 'sibling'

export type Item = {
   label: string,
   address: string,
   numAddress: number[],
   itemKey: string,
   isDropZone?: boolean
}

export interface DropZoneItem extends Item {
   isDropZone: true
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

   getSubtreeLength(itemKey: string): number {
      const treeStart = this.getItemIndex(itemKey)
      let treeEnd = treeStart + 1 // slicing boundary
      const $ = this._items
      while (treeEnd < $.length && $[treeEnd].address.startsWith($[treeStart].address))
         treeEnd++

      return treeEnd - treeStart
   }

   moveSubtree(itemKey: string, anchorItemKey: string, dropItem: Item): void {
      // similar to moveItem, except we locate and move an entire RANGE of items
      // 1. find subtree [startIdx, endIdx] starting at itemKey

      const treeStart = this.getItemIndex(itemKey)
      let treeEnd = treeStart + 1 // slicing boundary
      const $ = this._items
      while (treeEnd < $.length && $[treeEnd].address.startsWith($[treeStart].address))
         treeEnd++


      console.log("subtree length:", treeEnd - treeStart)

      // 2. calculate new addresses (numerical and string):
      const anchor = this.getItem(anchorItemKey)
      invar(anchor, "Anchor should exist! at" + anchorItemKey)
      const newTree = []
      for (let i = treeStart; i < treeEnd; i++) {
         // 2a. numerical is easy--simply prepend the numerical of the anchorItem
         const numAddress = [
            // 1. take anchor as prefix
            ...dropItem.numAddress, // as anchor
            // 2. strip entire treeHead address off of node address
            // 3. combine (1) (anchor) with (2) (tail)
            ...$[i].numAddress.slice($[treeStart].numAddress.length) // node
         ]
         /** example: we want to move the subtree at 10a14... to 2b...
          * ...here, anchor is 2b, treeHead is 10a14
          * ...a node like 10a14a would be stripped to "a", or [1]
          * ...resulting in 2b1
          */

         // 3. create new subtree using calculated addresses
         newTree.push({
            ...$[i], // original item
            numAddress,
            address: stringifyNumAddr(numAddress)
         })
      }
      // 4. create new list by slicing out old tree and slicing in new tree (similar to moveItem)
      const startIdx = treeStart
      const targetIdx = this.getItemIndex(anchorItemKey) + 1
      invar(targetIdx !== 0, "anchor not found!")
      if (startIdx === targetIdx) { // [slice1, newTree, slice2]
         this._items = [
            ...$.slice(0, startIdx),
            ...newTree,
            ...$.slice(startIdx + newTree.length)
         ]
      } else if (startIdx < targetIdx) { // does this work if targetIdx = $.length (we're appending to the end)
         //            (from) ----------> (to)
         // [slice1, {oldTree}, slice2, {newTree}, slice3]
         //          ^ startIdx
         //                     ^ startIdx + len
         //                             ^ target
         this._items = [
            ...$.slice(0, startIdx),
            ...$.slice(startIdx + newTree.length, targetIdx),
            ...newTree,
            ...$.slice(targetIdx)
         ]
      } else if (targetIdx < startIdx) {
         // [slice1, {newTree}, slice2, {oldTree}, slice3]
         //                             ^ startIdx
         this._items = [
            ...$.slice(0, targetIdx),
            ...newTree,
            ...$.slice(targetIdx, startIdx),
            ...$.slice(startIdx + newTree.length)
         ]
      }
      console.log("New Item List: ", this._items)
   }

   // a more elegant alternative to canDrop()
   // returns empty array if none can be dropped here
   getDropZoneItemsFor(draggedItemKey: string | null, hoverItemKey: string | null)
      : [null] // empty response
      | [dropZoneItems: DropZoneItem[], insertIdx: number] {

      const ret: DropZoneItem[] = []
      if (draggedItemKey === null || hoverItemKey === null) return [null]


      const draggedItem = this.getItem(draggedItemKey)
      const hoverItemIdx = this.getItemIndex(hoverItemKey)
      const hoverItem = this._items[hoverItemIdx]
      const nextItem: Item | undefined = this._items[hoverItemIdx + 1] // undefined if next is out of bounds
      invar(nextItem || hoverItemIdx === this._items.length - 1, "next should exist if we're not hovering over the last one")

      invar(hoverItem, () => `item should exist  for key ${hoverItemKey}`)
      invar(draggedItem, "should exist")

      // 1. return empty (not allowed) if attempting subtree move
      if (hoverItem.address.startsWith(draggedItem.address))
         return [null]

      // 2. return empty if first child already exists after hoverItem
      const firstChildAddr = firstChildAddress(hoverItem)
      if (hoverItemIdx === this._items.length - 1 || nextItem.address !== firstChildAddr) {
         // first child dropzone
         ret.push({
            isDropZone: true,
            label: draggedItem.label,
            address: firstChildAddr,
            numAddress: [...hoverItem.numAddress, 1],
            itemKey: `${draggedItem.itemKey}+child`
         })
      } else { // next child exists => no drop zones here
         return [null]
      }

      if (hoverItemIdx === this._items.length - 1) { // special case-- last time

      }

      function nextSiblingNumAddress(item: Item) {
         return [
            ...item.numAddress.slice(0, -1),
            item.numAddress[item.numAddress.length - 1] + 1
         ]
      }

      // 4. add ancestor siblings until we reach next level?
      let numAddr: number[] = nextSiblingNumAddress(hoverItem)
      do {
         const nextAddr = stringifyNumAddr(numAddr)
         if (nextItem?.address === nextAddr) break; // sibling already exists, no drop zone

         console.log("Adding nextAddr dropzone: ", nextAddr)
         ret.push({
            isDropZone: true,
            label: draggedItem.label,
            address: nextAddr,
            numAddress: numAddr,
            itemKey: `${draggedItemKey}+${numAddr.length}`, // should be unique 
         })
         numAddr = numAddr.slice(0, -1)
         numAddr[numAddr.length - 1]++
      } while (numAddr.length >= (nextItem?.numAddress.length ?? 1))

      return [
         ret,
         hoverItemIdx + 1
      ]
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

function firstChildAddress(item: Item): string {
   return stringifyNumAddr([...item.numAddress, 1])
}

export default generateRandomSortedAddresses