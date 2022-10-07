import React, { memo, useCallback, useRef, useState } from 'react';
import { faker } from '@faker-js/faker';
import { AnimatePresence, motion } from "framer-motion"
import invar from 'tiny-invariant';

import './App.css';
import useToggle, { useForceReRender } from './hooks/useToggle';
import { Item, DropZoneItem, SlipboxFiles } from './utils/addresses';

// TODO: use react-window
// TODO: fix dark mode on entire page
// TODO: signify active dropzone
// TODO: signify dragged (subtree)
// TODO: folding

// telemetry
let listItemRendered = 0

const LEN = 100
const DEFAULT_INDENT = true
const slipbox = new SlipboxFiles(
   Array(LEN).fill(null).map((_, i) => { return faker.hacker.phrase() })
)

type DisplayType = 'prefix' | 'suffix' | 'hidden'

/** properties:
 * 
 * - doesn't re-render when order changes
 * - only re-render when:
 *   - label changes
 *   - 
 */
type DragDropHandlerType = 'onDragStart' | 'onDragEnd' | 'onDrop' | 'onDragEnter';
// TODO: consider implementing as enum? e.g.:
// const enum DragDropCallbacks {
//    DragStart = 'onDragStart',
//    DragEnd = 'onDragEnd',
//    Drop = 'onDrop',
//    DragEnter = 'onDragEnter',
// }

type DragDropCallback = (item: Item, eventType: DragDropHandlerType, ev: Event) => void



function App() {
   // display options
   const [displayType, setDisplayType] = useState<DisplayType>("prefix")
   const [isIndenting, toggleIndenting] = useToggle(DEFAULT_INDENT)
   const forceRender = useForceReRender()

   return (
      <div className="App text-neutral-800 dark:bg-slate-800 dark:text-white max-h-full text-left flex flex-col h-screen">
         <div className='flex justify-between items-center'>
            <span className="p-3 text-lg">
               {LEN} Random files with Luhmann addresses ({listItemRendered})
            </span>
            <div key="Pickers" className="p-2 flex justify-end">

               <input type="checkbox" name="indentCheckbox" id="indentCheckbox" checked={isIndenting} onClick={ev => toggleIndenting()} />
               <span className="pl-1 pr-4 hover:cursor-default" onClick={ev => toggleIndenting()} >Indent</span>

               <span>Display Type:</span>
               <select className="pl-2 dark:text-inherit dark:bg-inherit"
                  value={displayType}
                  onChange={ev => setDisplayType(ev.target.value as DisplayType)}
                  name="displayType" id="displayType"
               >
                  <option value="prefix">Prefix</option>
                  <option value="suffix">Suffix</option>
                  <option value="hidden">Hidden</option>
               </select>
            </div>
         </div>
         <RegularList {...{
            items: slipbox.getItems(), displayType, isIndenting,
            forceRender
         }} />
         {/* FIXME <AutoReactWindowList {...{ items, displayType, isIndenting }} /> */}
      </div >
   );
}


const ItemDndCallbacks: DragDropHandlerType[] = ['onDragStart', 'onDragEnter', 'onDragEnd']
const DropZoneDndCallbacks: DragDropHandlerType[] = ['onDragEnter', 'onDrop']
function RegularList({ items, displayType, isIndenting, ...props }: {
   items: Item[]
   displayType: DisplayType
   isIndenting: boolean
   forceRender: () => void
}) {

   // track itemKeys
   const [dragEnterItemKey, setDragEnterItemKey] = useState<string | null>(null)
   const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null)

   const draggedItemKeyRef = useRef<string | null>(null)
   const hoverItemKeyRef = useRef<string | null>(null)

   draggedItemKeyRef.current = draggedItemKey
   hoverItemKeyRef.current = dragEnterItemKey

   // why not pass back the entire item?? that way we know the item type
   const dragDropCallback: DragDropCallback = useCallback((item, dndEventType, ev) => {
      // console.log(`${dndEventType} event for key ${item.itemKey}`)
      switch (dndEventType) {
         case 'onDragStart':
            if (item.itemKey !== draggedItemKeyRef.current)
               setDraggedItemKey(item.itemKey)
            break;
         case 'onDragEnter':
            // we must differentiate between drop zone hovering and non-dropzone hovering
            if (!item.isDropZone
               && item.itemKey !== hoverItemKeyRef.current
               && item.itemKey !== draggedItemKeyRef.current // hovering over self => no-op
            )
               setDragEnterItemKey(item.itemKey)
            break;
         case 'onDragEnd':
            if (draggedItemKeyRef.current || hoverItemKeyRef.current) {
               setDraggedItemKey(null)
               setDragEnterItemKey(null)
               console.log("Drag Ended")
            }
            break;
         case 'onDrop':
            invar(hoverItemKeyRef.current, "on drop should have valid anchor item key")
            invar(draggedItemKeyRef.current, "on drop should have dragged item key")
            slipbox.moveSubtree(draggedItemKeyRef.current, hoverItemKeyRef.current, item)
            // NO need: handled in onDragEnd (which sometimes fires first)
            // setDraggedItemKey(null)
            // setDragEnterItemKey(null)
            props.forceRender() // TODO: come up with better solution
            break;
         default:
            break;
      }
   }, []) // FIXME - this callback changes each DND state change...

   const itemList =
      items.map((item, i) => (
         <ListRowItem
            key={item.itemKey}
            item={item}
            itemKey={item.itemKey}
            displayType={displayType}
            indent={!isIndenting ? 0 : item.numAddress.length - 1}
            dndCallbacks={ItemDndCallbacks}
            dragDropCallback={dragDropCallback}
         />
      ))

   // Insert drop zones
   const [dropZoneItems, insertIdx] = slipbox.getDropZoneItemsFor(draggedItemKey, dragEnterItemKey)
   if (dropZoneItems) {
      const subtreeLength = slipbox.getSubtreeLength(draggedItemKey!)
      itemList.splice(insertIdx, 0, ...dropZoneItems.map(zoneItem => {
         return (
            <ListRowItem
               item={zoneItem}
               itemKey={zoneItem.itemKey} // unnecessary?
               key={zoneItem.itemKey}
               displayType={displayType}
               qtyDropped={subtreeLength}
               dndCallbacks={DropZoneDndCallbacks}
               dragDropCallback={dragDropCallback}
               indent={!isIndenting
                  ? 0
                  : zoneItem.numAddress.length - 1
               }
            />)
      }))

   }

   /** example:
    * 21 - 
    *    21a - 
    *    21b - 
    *        21b1
    *        21b2 (cursor here)
    * 22 -
    * 
    * given the above file list, the drop zone should be:
    * - 21b2a
    * - 21b3
    * - 21c ((sibling of parent))
    */

   return <AnimatePresence>
      {itemList}
   </AnimatePresence>
}






const INDENT_LEVELS = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80]

const ListRowItem = memo(({ item, displayType = 'prefix', indent = 0, ...props }: {
   item: Item | DropZoneItem
   itemKey: string
   displayType?: DisplayType
   indent?: number
   label?: string // allows container to deal with displayType, indentation, etc?
   dndCallbacks: DragDropHandlerType[]
   dragDropCallback: DragDropCallback
   qtyDropped?: number
}) => {
   ++listItemRendered // telemetry

   const qty = props.qtyDropped && props.qtyDropped > 1 // we don't care about single items?
      ? ` - (${props.qtyDropped} items)`
      : ""
   // TODO: this should be a separate span from item.address

   // indicate multiple items dropped?
   const labelSpan = <span className={`${item.isDropZone && "invisible"}`} > {item.label}</span >
   const label = displayType === 'hidden'
      ? <span>{labelSpan}</span>
      : displayType === 'prefix'
         ? <><span className="pr-1 text-neutral-400 float-left">{item.address + qty + " - "}</span> {labelSpan}</>
         : displayType === 'suffix'
            ? <>{labelSpan}<span className="pl-1 text-neutral-400">{`( ${item.address} )` + qty}</span></>
            : labelSpan

   const indentLvl = INDENT_LEVELS[Math.min(indent, INDENT_LEVELS.length - 1)]

   const motionProps = {
      layout: true,
   }
   // inspiration: https://codesandbox.io/s/framer-motion-list-transitions-forked-nqd2r?file=/src/App.js:2065-2089
   return (
      <motion.div
         {...motionProps}
         key={item.itemKey}
         className={`p-1 pl-8 dark:border-neutral-600 text-left justify-start border-y-neutral-200 border-y-2 border-solid border-2 ${item.isDropZone && 'border-dashed'}`}
         draggable
         style={{
            marginLeft: `${indentLvl * 0.25}em`,// mL because"ml-N" tailwind utility classes aren't working...
            marginTop: "-0.125em" // negative mT hack to avoid need to individually choose borderTop & borderBottom
            // source: https://stackoverflow.com/questions/8358134/partial-border-in-css
         }}
         // attach the same callback for each requested drag drop event type
         {...(props.dndCallbacks.reduce(
            (obj, evType: DragDropHandlerType) => {
               obj[evType] = (ev: Event) => {
                  props.dragDropCallback(item, evType, ev)
                  // ev.preventDefault() // no this will prevent events that need to be propagated enter events
               };
               return obj
            }
            , {
               // if DropZone add silencers for DragEnter and DragLeave
               ...(item.isDropZone && {
                  onDragEnter: (ev: Event) => { ev.preventDefault() },
                  onDragOver: (ev: Event) => { ev.preventDefault() }
               })
            } as any)
         )}
      >
         {label}
      </motion.div >
   )
})

export default App;
