import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import './App.css'

import FileExplorer from './FileExplorer'

const App = (): React.JSX.Element => {
  return (
    <div className="App">
      <FileExplorer />
    </div>
  )
}

export default App
