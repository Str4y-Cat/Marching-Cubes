
export default class Performance
{
    constructor()
    {
        //performance checks
        this.count={}
        this.time={}
        this.totalTime={}
    }

    counter(name,returnFlag,incrementValue)
    {

        // console.log("testing")
        // returnFlag=(returnFlag)?returnFlag:false

        if(returnFlag)
            {
                console.log(this.count)
                this.count={}

            }
        else
            {
                incrementValue=(incrementValue)?incrementValue:1
        
                if(this.count[name])
                    {
                        this.count[name]+=incrementValue
                    }
                else
                {
                    this.count[name]=incrementValue
                }
            }
        


    }

    timer(name,avg)
    {
        avg=(avg!=null)?avg:false
        // console.log("testing")
        // returnFlag=(returnFlag)?returnFlag:false
        if(this.time[name])
            {
                const delta=performance.now() - this.time[name].start
                
                // if(!this.time[name].total)
                //     {
                //     this.time[name].total=0
                //     this.time[name].count=0
                //     }
                
                // this.time[name].total+=Date.now() - this.time[name].start
                // this.time[name].count+=1
                if(this.totalTime[name]){
                    this.totalTime[name].time+= delta
                    this.totalTime[name].total+=1
                    this.totalTime[name].avg=this.totalTime[name].time/this.totalTime[name].total
                }
                else{
                    this.totalTime[name]={}
                    this.totalTime[name].time=delta
                    this.totalTime[name].total=1
                }
                if(avg){
                    console.log(`${name}: ${delta} ms\n average: ${this.totalTime[name].avg}`)
                }
                else{
                    console.log(`${name}: ${delta} ms`)

                }

                this.time[name]=null
            }
        else
        {
            this.time[name]={}
            this.time[name].start=performance.now();
        }

    }



}


