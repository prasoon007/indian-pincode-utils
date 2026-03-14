export function haversine(a:number[],b:number[]){

  const R = 6371

  const dLat = (b[0]-a[0]) * Math.PI/180
  const dLon = (b[1]-a[1]) * Math.PI/180

  const x =
    Math.sin(dLat/2)**2 +
    Math.cos(a[0]*Math.PI/180) *
    Math.cos(b[0]*Math.PI/180) *
    Math.sin(dLon/2)**2

  const c = 2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))

  return R*c

}