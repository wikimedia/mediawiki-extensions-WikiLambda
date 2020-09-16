<template>
	<ul>
		<li v-for="(value, key) in otherkeydata" :key="key">
			<button @click="removeEntry(key)">
				-
			</button>
			<span>{{ zkeylabels[key] }} ({{ key }}):</span>
			<input v-if="keyTypes[key] === 'string'"
				:value="value"
				@input="updateStringKey($event, key)"
			>
			<full-zobject v-else-if="keyTypes[key] === 'zobject'"
				:zobject="zobject[key]"
				:persistent="false"
				@input="updateKey($event, key)"
			></full-zobject>
			<list-value v-else-if="keyTypes[key] === 'list'"
				:list="zobject[key]"
				@input="updateKey($event, key)"
			></list-value>
			<select v-else @change="setKeyType($event, key)">
				<option selected
					disabled
					value="None"
				>
					Value Type
				</option>
				<option value="string">
					String or Reference
				</option>
				<option value="zobject">
					ZObject
				</option>
				<option value="list">
					List
				</option>
			</select>
		</li>
		<li>
			+ {{ keylabel }}: <input @change="addNewKey($event)">
		</li>
	</ul>
</template>

<script>
var FullZobject = require( './FullZobject.vue' ),
	ListValue = require( './ListValue.vue' );

module.exports = {
	name: 'OtherKeys',
	props: [ 'zobject' ],
	data: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			ztypes = editingData.ztypes,
			zkeylabels = editingData.zkeylabels,
			otherkeydata = {},
			keyTypes = {},
			key,
			value;
		for ( key in this.zobject ) {
			if ( ( key.substring( 0, 3 ) === 'Z1K' ) || ( key === 'Z2K1' ) ) {
				continue;
			}
			value = this.zobject[ key ];
			otherkeydata[ key ] = value;
			if ( !( key in zkeylabels ) ) {
				zkeylabels[ key ] = key;
			}
			if ( typeof ( value ) === 'object' ) {
				if ( Array.isArray( value ) ) {
					keyTypes[ key ] = 'list';
				} else {
					keyTypes[ key ] = 'zobject';
				}
			} else {
				keyTypes[ key ] = 'string';
			}
		}
		return {
			keylabel: ztypes.Z3,
			keyTypes: keyTypes,
			otherkeydata: otherkeydata,
			zkeylabels: zkeylabels
		};
	},
	methods: {
		addNewKey: function ( event ) {
			var key = event.target.value;
			if ( key.match( /^Z\d+K\d+$/ ) ) {
				this.$set( this.otherkeydata, key, '' );
				if ( !( key in this.zkeylabels ) ) {
					this.$set( this.zkeylabels, key, key );
					this.$set( this.keyTypes, key, 'new' );
				}
			}
		},
		setKeyType: function ( event, key ) {
			var newtype = event.target.value;
			if ( newtype === 'zobject' ) {
				this.$set( this.zobject, key, {} );
			} else if ( newtype === 'list' ) {
				this.$set( this.zobject, key, [] );
			} else {
				this.$set( this.zobject, key, '' );
			}
			this.$set( this.keyTypes, key, newtype );
		},
		updateKey: function ( value, key ) {
			this.$set( this.zobject, key, value );
			this.$emit( 'input', this.zobject );
		},
		updateStringKey: function ( event, key ) {
			this.$set( this.zobject, key, event.target.value );
			this.$emit( 'input', this.zobject );
		},
		removeEntry: function ( key ) {
			this.$delete( this.zobject, key );
			this.$delete( this.otherkeydata, key );
			this.$delete( this.keyTypes, key );
			this.$emit( 'input', this.zobject );
		}
	},
	components: {
		'full-zobject': FullZobject,
		'list-value': ListValue
	}
};
</script>
