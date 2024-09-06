// quadtree.ts
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Quadtree<T extends Rectangle> {
  private bounds: Rectangle;
  private capacity: number;
  private objects: T[] = [];
  private divided: boolean = false;
  private northwest: Quadtree<T> | null = null;
  private northeast: Quadtree<T> | null = null;
  private southwest: Quadtree<T> | null = null;
  private southeast: Quadtree<T> | null = null;

  constructor(bounds: Rectangle, capacity: number) {
    this.bounds = bounds;
    this.capacity = capacity;
  }

  public insert(object: T): boolean {
    if (!this.contains(this.bounds, object)) {
      return false;
    }

    if (this.objects.length < this.capacity) {
      this.objects.push(object);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northwest!.insert(object) ||
      this.northeast!.insert(object) ||
      this.southwest!.insert(object) ||
      this.southeast!.insert(object)
    );
  }

  public query(range: Rectangle, found: T[] = []): T[] {
    if (!this.intersects(this.bounds, range)) {
      return found;
    }

    for (const object of this.objects) {
      if (this.intersects(object, range)) {
        found.push(object);
      }
    }

    if (this.divided) {
      this.northwest!.query(range, found);
      this.northeast!.query(range, found);
      this.southwest!.query(range, found);
      this.southeast!.query(range, found);
    }

    return found;
  }

  private contains(a: Rectangle, b: Rectangle): boolean {
    return (
      b.x >= a.x &&
      b.x + b.width <= a.x + a.width &&
      b.y >= a.y &&
      b.y + b.height <= a.y + a.height
    );
  }

  private intersects(a: Rectangle, b: Rectangle): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.northwest = new Quadtree<T>(
      { x, y, width: halfWidth, height: halfHeight },
      this.capacity
    );
    this.northeast = new Quadtree<T>(
      { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
      this.capacity
    );
    this.southwest = new Quadtree<T>(
      { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
      this.capacity
    );
    this.southeast = new Quadtree<T>(
      {
        x: x + halfWidth,
        y: y + halfHeight,
        width: halfWidth,
        height: halfHeight,
      },
      this.capacity
    );

    this.divided = true;
  }
}
