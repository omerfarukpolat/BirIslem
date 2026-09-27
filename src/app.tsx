import { useEffect } from 'preact/hooks';
import { ErrorBoundary, LocationProvider, Route, Router, lazy, useLocation } from 'preact-iso';
import Home from './screens/Home';
import Solo from './screens/Solo';
import { toastMessage } from './state/toast';
import './screens/screens.css';

const Daily = lazy(() => import('./screens/Daily'));
const Leaderboard = lazy(() => import('./screens/Leaderboard'));
const Party = lazy(() => import('./screens/party/Party'));
const OnlineEntry = lazy(() => import('./screens/online/OnlineEntry'));
const OnlineRoom = lazy(() => import('./screens/online/OnlineRoom'));

function NotFound() {
  const { route } = useLocation();
  useEffect(() => route('/', true), []);
  return null;
}

function ScrollTop() {
  const { path } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [path]);
  return null;
}

function Toaster() {
  const t = toastMessage.value;
  return t ? (
    <div class="toast" role="status" key={t.id}>
      {t.text}
    </div>
  ) : null;
}

export function App() {
  return (
    <LocationProvider>
      <ScrollTop />
      <ErrorBoundary>
        <Router>
          <Route path="/" component={Home} />
          <Route path="/game" component={Solo} />
          <Route path="/gunun-sorusu" component={Daily} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/karsilikli" component={Party} />
          <Route path="/oda" component={OnlineEntry} />
          <Route path="/oda/:code" component={OnlineRoom} />
          <Route default component={NotFound} />
        </Router>
      </ErrorBoundary>
      <Toaster />
    </LocationProvider>
  );
}
