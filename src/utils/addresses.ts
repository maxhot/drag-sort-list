import invariant from "tiny-invariant"

export type Address = {
   strAddress: string,
   numAddress: number[],
}

function generateAddresses(length: number): Address[] {
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
            invariant(false, "This cannot be!")
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

function stringifyNumAddr(addrAsNum: number[]) {
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
export default generateAddresses
// test
// console.log("10 addresses: ", generateAddresses(10))
