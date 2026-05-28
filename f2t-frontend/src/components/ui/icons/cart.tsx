import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const colors = require('../colors.js');

export const Cart = ({ color = colors.neutral[500] }: { color?: string }) => {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 2L7.17 4H3C1.9 4 1 4.9 1 6V18C1 19.1 1.9 20 3 20H21C22.1 20 23 19.1 23 18V6C23 4.9 22.1 4 21 4H16.83L15 2H9ZM9 4H15L16.83 6H21V18H3V6H7.17L9 4ZM12 8C10.34 8 9 9.34 9 11H11C11 10.45 11.45 10 12 10C12.55 10 13 10.45 13 11C13 12 12 12 12 14H14C14 12 15 12 15 11C15 9.34 13.66 8 12 8Z"
        fill={color}
      />
    </Svg>
  );
};
