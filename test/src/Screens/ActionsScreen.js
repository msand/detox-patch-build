import React, { Component } from 'react';
import {
  Text,
  BackHandler,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl
} from 'react-native';

export default class ActionsScreen extends Component {

  constructor(props) {
    super(props);
    this.state = {
      greeting: undefined,
      typeText: '',
      clearText: 'some stuff here..',
      numTaps: 0,
      isRefreshing: false,
      backPressed: false,
    };
  }

  componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.backHandler.bind(this));
  }

  render() {
    if (this.state.greeting) return this.renderAfterButton();
    if (this.state.backPressed) return this.renderPopupBackPressedDetected();
    return (
      <View testID='View7990' style={{ flex: 1, paddingTop: 40, justifyContent: 'flex-start' }}>

        <TouchableOpacity onPress={this.onButtonPress.bind(this, 'Tap Working')}
          onLongPress={this.onButtonPress.bind(this, 'Long Press Working')}
        >
          <Text style={{ color: 'blue', marginBottom: 20, textAlign: 'center' }}>Tap Me</Text>
        </TouchableOpacity>

        <TouchableOpacity
          delayLongPress={1200}
          onLongPress={this.onButtonPress.bind(this, 'Long Press With Duration Working')}
        >
          <Text style={{ color: 'blue', marginBottom: 20, textAlign: 'center' }}>Long Press Me 1.5s</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={this.onLongTimeout.bind(this)}
        >
          <Text testID='WhyDoAllTheTestIDsHaveTheseStrangeNames' style={{ color: 'blue', marginBottom: 20, textAlign: 'center' }}>Tap Me For Long Timeout</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={this.onMultiTapPress.bind(this)}>
          <Text style={{ color: 'blue', marginBottom: 20, textAlign: 'center' }}
            testID='UniqueId819'>Taps: {this.state.numTaps}</Text>
        </TouchableOpacity>

        <TextInput style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 20, marginHorizontal: 20, padding: 5 }}
          onChangeText={this.onChangeTypeText.bind(this)}
          value={this.state.typeText}
          testID='UniqueId937'
          onSubmitEditing={this.onReturn.bind(this)}
        />

        <TextInput style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 20, marginHorizontal: 20, padding: 5 }}
          onChangeText={this.onChangeClearText.bind(this)}
          value={this.state.clearText}
          testID='UniqueId005'
        />

        <TextInput style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 20, marginHorizontal: 20, padding: 5 }}
          onChangeText={this.onReplaceText.bind(this)}
          value={this.state.replaceText}
          testID='UniqueId006'
        />

        <View style={{ height: 100, borderColor: '#c0c0c0', borderWidth: 1, backgroundColor: '#f8f8ff', marginBottom: 20 }}>
          <ScrollView testID='ScrollView161'>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text1</Text>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text2</Text>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text3</Text>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text4</Text>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text5</Text>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text6</Text>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text7</Text>
            <Text style={{ height: 30, backgroundColor: '#e8e8f8', padding: 5, margin: 10 }}>Text8</Text>
          </ScrollView>
        </View>

        <View style={{ height: 100, borderColor: '#c0c0c0', borderWidth: 1, backgroundColor: '#f8f8ff', marginBottom: 20 }}>
          <ScrollView testID='ScrollView799' refreshControl={
            <RefreshControl refreshing={this.state.isRefreshing} onRefresh={this.onRefresh.bind(this)} title="Loading..." />
          }>
          </ScrollView>
        </View>
        <View>
          <ScrollView testID='PinchableScrollView' minimumZoomScale={1} maximumZoomScale={10}>
            <View>
              <View testID='UniqueId007' style={{ height: 30, width: 30, backgroundColor:'red' }} />
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  renderAfterButton() {
    return (
      <View style={{ flex: 1, paddingTop: 20, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 25 }}>
          {this.state.greeting}!!!
        </Text>
      </View>
    );
  }

  renderPopupBackPressedDetected() {
    return (
      <View style={{ flex: 1, paddingTop: 20, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 25 }}>
          Back pressed !
        </Text>
      </View>
    );
  }

  onButtonPress(greeting) {
    this.setState({
      greeting: greeting
    });
  }

  onReturn() {
    this.setState({
      greeting: "Return Working"
    });
  }

  onLongTimeout() {
    setTimeout(() => {
      this.setState({
        greeting: "After Long Timeout"
      });
    }, 4000);
  }

  onMultiTapPress() {
    this.setState({
      numTaps: this.state.numTaps + 1
    });
  }

  onChangeTypeText(text) {
    if (text === 'passcode') {
      this.setState({
        greeting: 'Type Working'
      });
    } else {
      this.setState({
        typeText: text
      });
    }
  }

  onReplaceText(text) {
    if (text === 'replaced_text') {
      this.setState({
        greeting: 'Replace Working'
      });
    } else {
      this.setState({
        replaceText: text
      });
    }
  }

  onChangeClearText(text) {
    if (text === '') {
      this.setState({
        greeting: 'Clear Working'
      });
    } else {
      this.setState({
        clearText: text
      });
    }
  }

  onRefresh() {
    this.setState({
      isRefreshing: true
    });
    setTimeout(() => {
      this.setState({
        greeting: 'PullToReload Working'
      });
    }, 500);
  }

  backHandler() {
    this.setState({
      backPressed: true
    });
    return true;
  };

}
