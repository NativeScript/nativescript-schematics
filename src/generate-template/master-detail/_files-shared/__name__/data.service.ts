import { Injectable } from '@angular/core';

export interface Number {
  id: number;
  text: string;
}

@Injectable()
export class DataService {
  private numbers: Number[] = [
    { id: 1, text: 'one' },
    { id: 2, text: 'two' },
    { id: 3, text: 'three' },
    { id: 4, text: 'four' },
    { id: 5, text: 'five' },
    { id: 6, text: 'six' },
    { id: 7, text: 'seven' },
    { id: 8, text: 'eight' },
  ];

  getNumbers(): Number[] {
    return this.numbers;
  }

  getNumber(id: number): Number {
    return this.numbers.filter(number => number.id === id)[0];
  }
}
