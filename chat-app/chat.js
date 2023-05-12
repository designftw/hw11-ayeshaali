import * as Vue from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'
import { mixin } from "https://mavue.mavo.io/mavue.js";
import GraffitiPlugin from 'https://graffiti.garden/graffiti-js/plugins/vue/plugin.js'
import Resolver from './resolver.js'

const app = {
  // Import MaVue
  mixins: [mixin],

  // Import resolver
  created() {
    this.resolver = new Resolver(this.$gf);
  },

  setup() {
    const channel = Vue.ref('default')
    const group = Vue.ref("Muslim Students' Association")
    const $gf = Vue.inject('graffiti')
    const context = Vue.computed(() => group.value);
    const { objects: messagesRaw } = $gf.useObjects([context])
    const { objects: groupsRaw } = $gf.useObjects(["appgroups"])
    return { group, channel, messagesRaw, groupsRaw }
  },

  data() {
    // Initialize some more reactive variables
    return {
      messageText: '',
      editID: '',
      editText: '',
      recipient: '',
      //////////////////////////////
      // Problem 1 solution
      preferredUsername: '',
      usernameResult: '',
      //////////////////////////////
      //////////////////////////////
      // Problem 2 solution
      recipientUsername: '',
      recipientUsernameSearch: '',
      //////////////////////////////
      //////////////////////////////
      // Problem 3 solution
      myUsername: '',
      actorsToUsernames: {},
      /////////////////////////////
      imageDownloads: {},
      /////////////////////////////
      channelToAdd: "",
      groupToAdd: "",
      tab: "Chats",
      /////////////////////////////
      eventName: "",
      eventDesc: "",
      eventStart: "",
      eventEnd: ""
    }
  },

  //////////////////////////////
  // Problem 3 solution
  watch: {
    '$gf.me': async function(me) {
      this.myUsername = await this.resolver.actorToUsername(me);
    },

    async messages(messages) {
      for (const m of messages) {
        if (!(m.actor in this.actorsToUsernames)) {
          const actor = m.actor;
          const username = await this.resolver.actorToUsername(m.actor)
          this.actorsToUsernames = {
            ...this.actorsToUsernames,
            [actor]: username
          }
        }
        if (m.bto && m.bto.length && !(m.bto[0] in this.actorsToUsernames)) {
          const actor = m.bto[0];
          const username = await this.resolver.actorToUsername(m.bto[0]);
          this.actorsToUsernames = {
            ...this.actorsToUsernames,
            [actor]: username
          }
        }
      }
    },

    async messagesWithAttachments(messages) {
      for (const m of messages) {
        if (!(m.attachment.magnet in this.imageDownloads)) {
          this.imageDownloads[m.attachment.magnet] = "downloading"
          let blob
          try {
            blob = await this.$gf.media.fetch(m.attachment.magnet)
          } catch(e) {
            this.imageDownloads[m.attachment.magnet] = "error"
            continue
          }
          this.imageDownloads[m.attachment.magnet] = URL.createObjectURL(blob)
        }
      }
    }
  },
  /////////////////////////////

  computed: {
    groups() {
      let groups = this.groupsRaw.filter(m=> m.type=='Organization')
      groups = [...new Set(groups.map(element => element.name))]
      return groups
    },

    channels() {
      let channels = this.messagesRaw.filter(m=> m.type=='Group');
      channels = [...new Set(channels.map(element => element.name))]
      return channels
    },

    messages() {
      let messages = this.messagesRaw.filter(m=>
          m.type && m.type=='Note' && (m.content || m.content == '') && typeof m.content=='string' && m.channel == this.channel)
      return messages.sort((m1, m2)=> new Date(m2.published) - new Date(m1.published)).slice(0,50)
    },

    messagesWithAttachments() {
      return this.messages.filter(m=>
        m.attachment &&
        m.attachment.type == 'Image' &&
        typeof m.attachment.magnet == 'string')
    },

    events() {
      let events = this.messagesRaw
        // Filter the "raw" messages for data
        // that is appropriate for our application
        // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
        .filter(m=>
          // Does the message have a type property?
          m.type         &&
          // Is the value of that property 'Note'?
          m.type=='Event' &&
          // Does the message have a content property?
          (m.content || m.content == '') &&
          // Is that property a string?
          typeof m.content=='string')

      return messages
        // Sort the messages with the
        // most recently created ones first
        .sort((m1, m2)=> new Date(m2.published) - new Date(m1.published))
        // Only show the 10 most recent ones
        .slice(0,50)
    },
  },

  methods: {
    async getUsername(me) {
      this.myUsername = await this.resolver.actorToUsername(me);
      this.actorsToUsernames = {
        ...this.actorsToUsernames,
        [me]: this.myUsername
      }
    },

    async sendMessage() {
      const message = {
        type: 'Note',
        content: this.messageText,
        channel: this.channel,
        context: [this.group]
      }

      if (this.file) {
        message.attachment = {
          type: 'Image',
          magnet: await this.$gf.media.store(this.file)
        }
        this.file = null
      }
      this.$gf.post(message);
      this.messageText = '';
    },

    removeMessage(message) {
      this.$gf.remove(message)
    },

    startEditMessage(message) {
      // Mark which message we're editing
      this.editID = message.id
      // And copy over it's existing text
      this.editText = message.content
    },

    saveEditMessage(message) {
      // Save the text (which will automatically
      // sync with the server)
      message.content = this.editText
      // And clear the edit mark
      this.editID = ''
    },

    /////////////////////////////
    // Problem 1 solution
    async setUsername() {
      try {
        this.usernameResult = await this.resolver.requestUsername(this.preferredUsername)
        this.myUsername = this.preferredUsername
      } catch (e) {
        this.usernameResult = e.toString()
      }
    },
    /////////////////////////////

    /////////////////////////////

    onImageAttachment(event) {
      const file = event.target.files[0]
      this.file = file
    },

    addGroup() {
      const group = {
        type: 'Organization',
        name: this.groupToAdd,
        context: ["appgroups"]
      }
      this.$gf.post(group);
      this.group = this.groupToAdd;
      this.groupToAdd = "";
    },

    addChannel() {
      const channel = {
        type: 'Group',
        name: this.channelToAdd,
        context: [this.group]
      }
      this.$gf.post(channel);
      this.channel = this.channelToAdd;
      this.channelToAdd = "";
    },

    /////////////////////////////
    // Events

    setTab(tab) {
      this.tab = tab;
    },

    async createEvent() {
      const event = {
        type: 'Event',
        name: this.eventName,
        desc: this.eventDesc,
        startTime: this.eventStart,
        endTime: this.eventEnd,
        context: [this.group]
      }
      this.$gf.post(event);
      this.eventName="";
      this.eventDesc="";
      this.eventStart="";
      this.eventEnd ="";
    }
  }
}

const Name = {
  props: ['actor', 'editable'],

  setup(props) {
    // Get a collection of all objects associated with the actor
    const { actor } = Vue.toRefs(props)
    const $gf = Vue.inject('graffiti')
    return $gf.useObjects([actor])
  },

  computed: {
    profile() {
      return this.objects.filter(m=> m.type && m.type=='Profile' && m.name && typeof m.name=='string')
        .reduce((prev, curr)=> !prev || curr.published > prev.published? curr : prev, null)
    }
  },

  data() {
    return {
      editing: false,
      editText: ''
    }
  },

  methods: {
    editName() {
      this.editing = true
      // If we already have a profile,
      // initialize the edit text to our existing name
      this.editText = this.profile? this.profile.name : this.editText
    },

    saveName() {
      if (this.profile) {
        // If we already have a profile, just change the name
        // (this will sync automatically)
        this.profile.name = this.editText
      } else {
        // Otherwise create a profile
        this.$gf.post({
          type: 'Profile',
          name: this.editText
        })
      }

      // Exit the editing state
      this.editing = false
    }
  },

  template: '#name'
}

const Like = {
  props: ["messageid"],
  
  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid')
    const { objects: likesRaw } = $gf.useObjects([messageid])
    return { likesRaw }
  },

  computed: {
    likes() {
      return this.likesRaw.filter(l=>
        l.type == 'Like' &&
        l.object == this.messageid)
    },

    numLikes() {
      // Unique number of actors
      return [...new Set(this.likes.map(l=>l.actor))].length
    },

    myLikes() {
      return this.likes.filter(l=> l.actor == this.$gf.me)
    }
  },

  methods: {
    toggleLike() {
      if (this.myLikes.length) {
        this.$gf.remove(...this.myLikes)
      } else {
        this.$gf.post({
          type: 'Like',
          object: this.messageid,
          context: [this.messageid]
        })
      }
    }
  },

  template: '#like'
}

const Read = {
  props: ["messageid","actordict"],

  created() {
    this.refreshKey = 0;
    this.sendRead();
  },

  setup(props) {
    const $gf = Vue.inject('graffiti')
    const state = Vue.toRefs(props);
    const messageid = Vue.toRef(props, 'messageid')
    const actordict = Vue.toRef(props, 'actordict')
    const { objects: readsRaw } = $gf.useObjects([messageid])
    return { readsRaw }
  },

  watch: {
    actordict: function(newVal){
      this.refreshKey +=1;
    }
  },

  computed: {
    reads() {
      return this.readsRaw.filter(l=>
        l.type == 'Read' &&
        l.object == this.messageid)
    },

    readsActor() {
      // Unique number of actors
      return [...new Set(this.reads.map(l=>l.actor))]
    },

    readsUsername() {
      return this.readsActor.map(a=> this.actordict && this.actordict[a] ? this.actordict[a] : a)
    },

    myRead() {
      return this.reads.filter(l=> l.actor == this.$gf.me)
    }
  },

  methods: {
    sendRead() {
      if (this.myRead.length == 0) {
        this.$gf.post({
          type: 'Read',
          object: this.messageid,
          context: [this.messageid]
        })
        // this.readsRaw = this.$gf.useObjects([this.messageid]);
      }
    }
  },

  template: '#read'
}

const Profile = {
  props: ['actor', 'editable'],

  created() {
    this.resolver = new Resolver(this.$gf);
  },

  setup(props) {
    const { actor } = Vue.toRefs(props)
    const $gf = Vue.inject('graffiti')
    return $gf.useObjects([actor])
  },

  computed: {
    profile() {
      const filtered= this.objects.filter(m=> m.type==="Profile" && m.icon && m.icon.type === 'Image')
      .reduce((prev, curr)=> !prev || curr.published > prev.published? curr : prev, null);
      return filtered;
    }
  },

  watch: {
    async profile(profile) {
      let blob;
      try {
        let magnet = await this.$gf.media.fetch(profile.icon.magnet);
        blob = URL.createObjectURL(magnet)
      } catch(e) {
        blob = null
      }
      this.image = blob;
    }
  },

  data() {
    return {
      editing: false,
      editText: '',
      file: null,
      image: null
    }
  },

  methods: {
    async setProfilePic() {
      const message = {
        type: 'Profile',
        icon: {
          type: 'Image',
          magnet: await this.$gf.media.store(this.file)
        }
      }
      this.file = null;
      this.$gf.post(message);
    },

    onImageAttachment(event) {
      const file = event.target.files[0]
      this.file = file;
    }
  },

  template: '#profile'
}

const Reply = {

  props: ["messageid","actordict"],

  components: {
    'read': Read, 
    'name': Name,
    'profile': Profile,
  },

  created() {
    this.refreshKey = 0;
 
  },

  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid')
    const actordict = Vue.toRef(props, 'actordict')
    const { objects: repliesRaw } = $gf.useObjects([messageid])
    return { repliesRaw }
  },

  computed: {
    replies() {
      return this.repliesRaw.filter(l=>
        l.type == 'Note' &&
        l.inReplyTo == this.messageid)
    },

    myReply() {
      return this.replies.filter(l=> l.actor == this.$gf.me)
    }
  },

  watch: {
    actordict: function(newVal){
      this.refreshKey +=1;
    }
  },

  data() {
    // Initialize some more reactive variables
    return {
      messageText: '',
      editID: '',
      editText: '',
    }
  },

  methods: {
    async sendReply() {
      const message = {
        type: 'Note',
        content: this.messageText,
        inReplyTo: this.messageid,
        context: [this.messageid]
      }

      if (this.file) {
        message.attachment = {
          type: 'Image',
          magnet: await this.$gf.media.store(this.file)
        }
        this.file = null
      }
      this.$gf.post(message);
      this.messageText = ''
    },

    onImageAttachment(event) {
      const file = event.target.files[0]
      this.file = file
    },

    removeMessage(message) {
      this.$gf.remove(message)
    },

    startEditMessage(message) {
      // Mark which message we're editing
      this.editID = message.id
      // And copy over it's existing text
      this.editText = message.content
    },

    saveEditMessage(message) {
      // Save the text (which will automatically
      // sync with the server)
      message.content = this.editText
      // And clear the edit mark
      this.editID = ''
    },
  },

  template: '#reply'
}

app.components = { Name, Like, Read, Reply, Profile }
Vue.createApp(app)
   .use(GraffitiPlugin(Vue))
   .mount('#app')
