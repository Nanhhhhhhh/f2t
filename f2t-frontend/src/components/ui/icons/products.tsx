import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const colors = require('../colors.js');

export const Products = ({
  color = colors.neutral[500],
}: {
  color?: string;
}) => {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 2H4C3 2 2 2.9 2 4V7.01C2 7.73 2.43 8.35 3 8.7V20C3 21.1 4.1 22 5 22H19C19.9 22 21 21.1 21 20V8.7C21.57 8.35 22 7.73 22 7.01V4C22 2.9 21 2 20 2ZM19 20H5V9H19V20ZM20 7H4V4H20V7ZM6 12H11V14H6V12ZM13 12H18V14H13V12ZM6 15H11V17H6V15ZM13 15H18V17H13V15Z"
        fill={color}
      />
    </Svg>
  );
};
