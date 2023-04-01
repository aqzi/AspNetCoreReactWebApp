import { useEffect } from 'react';
import { Container } from 'reactstrap';
import { NavMenu } from './NavMenu';

export const Layout = (props: any) => {
  useEffect(() => {
    document.title = 'Layout';
  }, []);
  
  return (
    <div>
      <NavMenu />
      <Container>
        {props.children}
      </Container>
    </div>
  );
};
