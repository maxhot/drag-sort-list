import React, { DragEventHandler, memo, useCallback, useState } from 'react';
import './App.css';
import { faker } from '@faker-js/faker';
import generateAddresses, { Address } from './utils/addresses';
import useToggle from './hooks/useToggle';
import { FixedSizeList, VariableSizeList } from 'react-window'
import AutoSizer from "react-virtualized-auto-sizer";


// TODO: use react-window


// telemetry
let listItemRenders = 0
const DEFAULT_INDENT = true

const LEN = 100
const addresses: Address[] = generateAddresses(LEN) // TODO: include indentation

/** item properties
 * 
 * look up index by key => fast because we need to render those drop zones on hover
 * 
 */
const items: Item[] = Array(LEN).fill(null).map((_, i) => {
   return {
      label: faker.hacker.phrase(),
      address: addresses[i].strAddress,
      numAddress: addresses[i].numAddress,
      itemKey: "" + i,
   }
})

type Item = {
   label?: string,
   address: string,
   numAddress: number[],
   itemKey: string,
}

type DisplayType = 'prefix' | 'suffix' | 'hidden'

/** properties:
 * 
 * - doesn't re-render when order changes
 * - only re-render when:
 *   - label changes
 *   - 
 */
type DragDropHandlerType = 'onDragStart' | 'onDragEnd' | 'onDrop' | 'onDragEnter';
// TODO: consider implementing as enum?
// const enum DragDropCallbacks {
//    DragStart = 'onDragStart',
//    DragEnd = 'onDragEnd',
//    Drop = 'onDrop',
//    DragEnter = 'onDragEnter',
// }

type DragDropCallback = (itemKey: string, eventType: string, ev: Event) => void



function App() {
   // display options
   const [displayType, setDisplayType] = useState<DisplayType>("prefix")
   const [isIndenting, toggleIndenting] = useToggle(DEFAULT_INDENT)

   return (
      <div className="App text-neutral-800 dark:bg-slate-800 dark:text-white max-h-full text-left flex flex-col h-screen">
         <div className='flex justify-between items-center'>
            <span className="p-3 text-lg">{LEN} Random files with Luhmann addresses</span>
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
         <div className="max-h-full" style={{ height: "100%" }}>
            <RegularList {...{ items, displayType, isIndenting }} />
            {/* FIXME <AutoReactWindowList {...{ items, displayType, isIndenting }} /> */}
         </div>
      </div >
   );
}

function RegularList({ items, displayType, isIndenting, ...props }: {
   items: Item[]
   displayType: DisplayType
   isIndenting: boolean
}) {

   const dragDropCallback: DragDropCallback = useCallback((itemKey, dndEventType, ev) => {
      console.log(`${dndEventType} event for key ${itemKey}`, ev)
   }, [])

   const itemList =
      items.map((item, i) => (
         <ListRowItem
            key={item.itemKey}
            item={item}
            displayType={displayType}
            indent={!isIndenting ? 0 : item.numAddress.length - 1}
            dndCallbacks={['onDragStart', 'onDragEnter', 'onDragEnd']}
            dragDropCallback={dragDropCallback}
         />
      ))

   // TODO: insert drop zones
   return <div key="list" className="List">{itemList}</div>
}


const ListRowItem = memo(({ item, displayType, indent, ...props }: {
   item: Item
   displayType?: DisplayType
   indent: number
   label?: string // allows container to deal with displayType, indentation, etc?
   dndCallbacks: DragDropHandlerType[]
   dragDropCallback: DragDropCallback
}) => {
   console.log(`List Items rendered: ${++listItemRenders}`)

   const label = displayType === 'hidden' ? <span>{item.label}</span>
      : displayType === 'prefix' ? <><span className="pr-1 text-neutral-400 float-left">{item.address + " - "}</span> {item.label}</>
         : displayType === 'suffix' ? <>{`${item.label}`} <span className="pl-1 text-neutral-400">{`( ${item.address} )`}</span></>
            : 'INVALID'

   const indentLevels = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80]
   const indentLvl = indentLevels[Math.min(indent, indentLevels.length - 1)]
   return (
      <div
         key={item.itemKey}
         className={`p-1 pl-8 dark:border-neutral-600 text-left justify-start border-y-neutral-200 border-y-2 border-solid border-2 `}
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
                  props.dragDropCallback(item.itemKey, evType, ev)
                  // ev.preventDefault() // this will prevent associated enter events
               };
               return obj
            }
            , {} as any)
         )}
      >
         {label}
      </ div >
   )
})

function AutoReactWindowList({ items, displayType, isIndenting, ...props }: {
   items: Item[]
   displayType: DisplayType
   isIndenting: boolean
   dragDropCallback: DragDropCallback
}) {
   return (<AutoSizer>
      {({ height, width }) => (
         <FixedSizeList
            className="ReactWindowList"
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={40} // best estimate
         >
            {({ index, style }) => (
               <ListRowItem
                  key={items[index].itemKey}
                  item={items[index]}
                  displayType={displayType}
                  indent={!isIndenting ? 0 : items[index].numAddress.length - 1}
                  dndCallbacks={[]}
                  dragDropCallback={props.dragDropCallback}
               />
            )}
         </FixedSizeList>
      )}
   </AutoSizer>)
}

export default App;
