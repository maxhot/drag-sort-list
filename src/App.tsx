import React, { useState } from 'react';
import './App.css';
import { faker } from '@faker-js/faker';
import generateAddresses, { Address } from './utils/addresses';
import useToggle from './hooks/useToggle';
// import { FixedSizeList } from 'react-window' // TODO


// TODO: use react-window


// telemetry
let listItemRenders = 0
const DEFAULT_INDENT = true

const LEN = 100
const addresses: Address[] = generateAddresses(LEN) // TODO: include indentation
console.log("addresses:", addresses)
const items: Item[] = Array(LEN).fill(null).map((_, i) => {
   const numAddr = addresses[i].numAddress // shorthand 
   const borderTop = i === 0 || numAddr.length > addresses[i - 1].numAddress.length// shorter address => less indent => more exposed
   const borderBottom = i === addresses.length - 1 || numAddr.length > addresses[i + 1].numAddress.length
   return {
      label: faker.hacker.phrase(),
      address: addresses[i].strAddress,
      numAddress: addresses[i].numAddress,
      itemKey: "" + i,
      // note: currently unused in favor of margin-top hack (see below)
      borderTop,
      borderBottom,
   }
})

type Item = {
   label?: string,
   address: string,
   numAddress: number[],
   itemKey: string,
   borderTop: boolean,
   borderBottom: boolean,
}

type DisplayType = 'prefix' | 'suffix' | 'hidden'

function ListItem({ item, displayType, indent }: {
   item: Item
   displayType?: DisplayType
   indent: number
}) {
   listItemRenders++
   console.log(`ListItem renders: ${listItemRenders}`)

   const label = displayType === 'hidden' ? <span>{item.label}</span>
      : displayType === 'prefix' ? <><span className="pr-1 text-neutral-400 float-left">{item.address + " - "}</span> {item.label}</>
         : displayType === 'suffix' ? <>{`${item.label}`} <span className="pl-1 text-neutral-400">{`( ${item.address} )`}</span></>
            : 'INVALID'


   const simpleLabel = displayType === 'hidden' ? `${item.label}`
      : displayType === 'prefix' ? `${item.address} - ${item.label}`
         : displayType === 'suffix' ? `${item.label} ( ${item.address} )`
            : 'INVALID'

   const indentLevels = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80]
   const indentLvl = indentLevels[Math.min(indent, indentLevels.length - 1)]
   console.log("Indenting: ", indentLvl)
   return (
      <div
         key={item.itemKey}
         className={`p-1 pl-8 dark:border-neutral-600 text-left justify-start border-y-neutral-200 border-y-2 border-solid border-2 `}
         style={{
            marginLeft: `${indentLvl * 0.25}em`,// mL because"ml-N" tailwind utility classes aren't working...
            marginTop: "-0.125em" // negative mT hack to avoid need to individually choose borderTop & borderBottom
            // source: https://stackoverflow.com/questions/8358134/partial-border-in-css
         }}
      >
         {label}
      </ div >
   )
}
function App() {
   // display options
   const [displayType, setDisplayType] = useState<DisplayType>("prefix")
   const [isIndenting, toggleIndenting] = useToggle(DEFAULT_INDENT)

   return (
      <div className="App text-neutral-800 dark:bg-slate-800 dark:text-white max-h-full text-left">
         <div className='flex justify-between items-center'>
            <span className="p-3 text-lg">Random files with Luhmann addresses</span>
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
         <div key="list" className="List">
            {items.map((item, i) =>
               <ListItem
                  key={item.itemKey}
                  item={item}
                  displayType={displayType}
                  indent={isIndenting ? item.numAddress.length - 1 : 0}
               />
            )}
         </div>
      </div >
   );
}

export default App;
