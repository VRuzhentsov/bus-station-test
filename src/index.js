(async () => {
  console.debug("[root] script start");
  const performance = typeof window !== 'undefined' && window.performance ? window.performance : require('perf_hooks').performance;

  class Person {
    constructor({
                  hasTicket = false
                }) {
      this.hasTicket = hasTicket
    }
  }

  class BusLine {
    static BUS_LINE_SIZE = 15;

    constructor() {
      this.busLineStack = [];
    }

    pop() {
      return this.busLineStack.pop();
    }

    push(person) {
      // if not overloaded - push to stack
      if (this.busLineStack.length < BusLine.BUS_LINE_SIZE) {
        this.busLineStack.push(person);
      }
    }

    isEmpty() {
      return this.busLineStack.length === 0;
    }

    isFull() {
      return this.busLineStack.length === BusLine.BUS_LINE_SIZE;
    }
  }

  class TicketShop {
    static TICKET_SHOPS_AMOUNT = 2
    static TICKET_SHOP_LINE_SIZE = 5;
    static TICKET_SHOP_TICKET_TIME_TO_PURCHASE = 200;

    constructor() {
      this.ticketShopStack = [[],[]]
      this.purchasePromises = [null, null];
    }

    push(person) {
      for (let i = 0; i < this.ticketShopStack.length; i++) {
        const shopLine = this.ticketShopStack[i];
        if (shopLine.length < TicketShop.TICKET_SHOP_LINE_SIZE) {
          shopLine.push(person);
          break;
        }
      }
    }

    purchaseTicket(person) {
      return new Promise(resolve => {
        setTimeout(() => {
          person.hasTicket = true;
          resolve();
        }, TicketShop.TICKET_SHOP_TICKET_TIME_TO_PURCHASE);
      });
    }

    startPurchase(i, crowd) {
      if (this.ticketShopStack[i].length > 0 && this.purchasePromises[i] === null) {
        const person = this.ticketShopStack[i][0];
        this.purchasePromises[i] = this.purchaseTicket(person).then(() => {
          this.ticketShopStack[i].shift();
          this.purchasePromises[i] = null;
          crowd.push(person);
        });
      }
    }

    isFull() {
      return this.ticketShopStack.every(shop => shop.length === TicketShop.TICKET_SHOP_LINE_SIZE);
    }

    isEmpty() {
      return this.ticketShopStack.length === 0;
    }

    sizeOfStacks() {
      return this.ticketShopStack.map(shop => shop.length).reduce((acc, curr) => acc + curr, 0);
    }
  }

  class Crowd {
    static INIT_CROWD_SIZE = 50;
    static INIT_CROWD_CHANCE_TO_HAVE_TICKET = 0.2;

    constructor() {
      this.crowdStack = Array.from({ length: Crowd.INIT_CROWD_SIZE },
        () => new Person({ hasTicket: Math.random() < Crowd.INIT_CROWD_CHANCE_TO_HAVE_TICKET }));

    }

    peek() {
      return this.crowdStack[this.crowdStack.length - 1];
    }

    push(person) {
      this.crowdStack.push(person);
    }

    pop() {
      if(!this.isEmpty()) {
        return this.crowdStack.pop();
      }
    }

    isEmpty() {
      return this.crowdStack.length === 0;
    }
  }

  class Bus {
    static LOAD_TIME = 2000;
    static APPEAR_INTERVAL = 3000;
    constructor() {
      this.isAway = null;
      this.isLoading = null;
      this.busNumber = 1;
    }


    load(busLine) {
      this.isLoading = setTimeout(() => {
        const load = busLine.busLineStack.length;
        while (!busLine.isEmpty()) {
          busLine.pop(); // Clear the bus line
        }
        this.isLoading = null;
        console.debug(`Bus ${this.busNumber} is leaving`, {load});
        this.leave();
        this.busNumber++;
      }, Bus.LOAD_TIME);
    }

    leave() {
      this.isAway = setTimeout(() => {
        this.isAway = null;
      }, Bus.APPEAR_INTERVAL);
    }
  }


  class TicketProcessor {
    static DEBUG_LOOP_COUNTER = 1000;
    constructor() {
      this.crowd = new Crowd();
      this.busLine = new BusLine();
      this.ticketShop = new TicketShop(this.crowd);
      this.bus = new Bus();

      this.lastFrameTime = performance.now();
      this.frameDuration = 1000 / 60;

      this.debugLoopCounter = 0;
    }


    async process() {
      console.debug("[TicketProcessor] process start");

      const processTick = () => {
        const currentTime = performance.now();
        const elapsedTime = currentTime - this.lastFrameTime;
        if (elapsedTime < this.frameDuration) {
          setTimeout(processTick, 0);
          return;
        }
        this.lastFrameTime = currentTime;


        if ((!this.busLine.isEmpty()
          || !this.ticketShop.isEmpty()
          || !this.crowd.isEmpty()
        ) && this.debugLoopCounter < TicketProcessor.DEBUG_LOOP_COUNTER) {

          console.debug("[TicketProcessor] process loop tick", {
            crowdSize: this.crowd.crowdStack.length,
            ticketShopSize: this.ticketShop.sizeOfStacks(),
            ticketShopIsFull: this.ticketShop.isFull(),
            busLineSize: this.busLine.busLineStack.length,
            debugLoopCounter: this.debugLoopCounter
          });

          if (!this.crowd.isEmpty()) {
            // Process a person from the crowd
            const person = this.crowd.peek();
            if (person.hasTicket && !this.busLine.isFull()) {
              this.busLine.push(this.crowd.pop());
            } else if (!person.hasTicket && !this.ticketShop.isFull()) {
              const tempPerson = this.crowd.pop();
              console.debug("Person without ticket", tempPerson);
              this.ticketShop.push(tempPerson);
            }
          }

          if (!this.ticketShop.isEmpty()) {
            // Process a ticket from the shop
            for (let i = 0; i < this.ticketShop.purchasePromises.length; i++) {
              this.ticketShop.startPurchase(i, this.crowd);
            }
          }


          if (!this.busLine.isEmpty() && this.bus.isAway === null && this.bus.isLoading === null) {
            // Load the bus
            this.bus.load(this.busLine);
          }
          this.debugLoopCounter++;
          setTimeout(processTick, 0);
        } else {
          console.debug("[TicketProcessor] process end");
        }
      }

      processTick();

    }
  }


  const ticketProcessor = new TicketProcessor();
  ticketProcessor.process()
  console.debug("[root] main end");

})()