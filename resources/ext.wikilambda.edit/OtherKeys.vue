<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<ul>
		<li v-for="(value, key) in otherkeydata" :key="key">
			<button v-if="!viewmode"
				:title="tooltipRemoveZObjectKey"
				@click="removeEntry(key)"
			>
				{{ $i18n( 'wikilambda-editor-removeitem' ) }}
			</button>
			<span>{{ zKeyLabels[key] }} ({{ key }}):</span>
			<select-zobject v-if="!(key in keyTypes)"
				:type="Constants.Z_TYPE"
				@input="setKeyType($event, key)"
			></select-zobject>
			<span v-else-if="isZString( keyTypes[key] )">
				<span v-if="viewmode">
					<a v-if="value.match(/^Z\d+$/)" :href="'./ZObject:' + value">
						{{ value }}
					</a>
					<template v-else>{{ value }}</template>
				</span>
				<input v-else
					class="ext-wikilambda-zstring"
					:value="value"
					@input="updateStringKey($event, key)"
				>
			</span>
			<select-zobject v-else-if="isZReference( keyTypes[key] )"
				:search-text="zobject[key]"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></select-zobject>
			<list-value v-else-if="isZList( keyTypes[key] )"
				:list="zobject[key]"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></list-value>
			<multi-lingual-string v-else-if="isZMultilingualString( keyTypes[key] )"
				:mls-object="zobject[key]"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></multi-lingual-string>
			<full-zobject v-else
				:zobject="zobject[key]"
				:persistent="false"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></full-zobject>
		</li>
		<li v-if="!viewmode">
			{{ $i18n( 'wikilambda-editor-zobject-addkey' ) }}
			<zkey-input @change="addNewKey($event)"></zkey-input>
		</li>
	</ul>
</template>

<script>
var Constants = require( './Constants.js' ),
	FullZobject = require( './FullZobject.vue' ),
	ListValue = require( './ListValue.vue' ),
	ZKey = require( './ZKey.vue' ),
	SelectZobject = require( './SelectZobject.vue' ),
	ZMultiLingualString = require( './ZMultiLingualString.vue' ),
	mapState = require( 'vuex' ).mapState,
	mapMutations = require( 'vuex' ).mapMutations,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'OtherKeys',
	components: {
		'full-zobject': FullZobject,
		'list-value': ListValue,
		'zkey-input': ZKey,
		'select-zobject': SelectZobject,
		'multi-lingual-string': ZMultiLingualString
	},
	props: {
		zobject: {
			type: Object,
			default: function () {
				return {};
			}
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants,
			keylabel: '',
			keyTypes: null,
			otherkeydata: null
		};
	},
	computed: $.extend( {},
		mapState( [
			'fetchingZKeys',
			'zLangs',
			'zKeys',
			'zKeyLabels'
		] ),
		{
			tooltipRemoveZObjectKey: function () {
				return this.$i18n( 'wikilambda-editor-zobject-removekey-tooltip' );
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys' ] ),
		mapMutations( [ 'addZKeyLabel' ] ),
		{
			addNewKey: function ( key ) {
				if ( !( key in this.otherkeydata ) ) {
					this.$set( this.otherkeydata, key, '' );
				}
				if ( !( key in this.zKeyLabels ) ) {
					this.addZKeyLabel( {
						key: key,
						label: key
					} );
				}
			},

			setKeyType: function ( newType, key ) {
				var newObj = {};
				if ( newType === Constants.Z_STRING ) {
					this.$set( this.zobject, key, '' );
				} else if ( newType === Constants.Z_LIST ) {
					this.$set( this.zobject, key, [] );
				} else {
					newObj[ Constants.Z_OBJECT_TYPE ] = newType;
					this.$set( this.zobject, key, newObj );
				}
				this.$set( this.keyTypes, key, newType );
			},

			updateKey: function ( value, key ) {
				this.$set( this.otherkeydata, key, value );
				this.$set( this.zobject, key, value );
				this.$emit( 'input', this.zobject );
			},

			updateStringKey: function ( event, key ) {
				this.$set( this.otherkeydata, key, event.target.value );
				this.$set( this.zobject, key, event.target.value );
				this.$emit( 'input', this.zobject );
			},

			removeEntry: function ( key ) {
				this.$delete( this.otherkeydata, key );
				this.$delete( this.zobject, key );
				this.$delete( this.keyTypes, key );
				this.$emit( 'input', this.zobject );
			},

			isZReference: function ( key ) {
				return key === Constants.Z_REFERENCE;
			},

			isZString: function ( key ) {
				return key === Constants.Z_STRING;
			},

			isZList: function ( key ) {
				return key === Constants.Z_LIST;
			},

			isZMultilingualString: function ( key ) {
				return key === Constants.Z_MULTILINGUALSTRING;
			}
		}
	),
	created: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			otherkeydata = {},
			keyTypes = {},
			key,
			value;

		this.keylabel = editingData.ztypes.Z3;

		// We collect otherkeydata, keyTypes and zkeylabels from the zobject prop
		for ( key in this.zobject ) {
			if ( ( key.substring( 0, 3 ) === 'Z1K' ) || ( key === 'Z2K1' ) ) {
				continue;
			}
			value = this.zobject[ key ];
			otherkeydata[ key ] = value;
			if ( !( key in this.zKeyLabels ) ) {
				this.addZKeyLabel( {
					key: key,
					label: key
				} );
			}
			if ( typeof ( value ) === 'object' ) {
				if ( Array.isArray( value ) ) {
					keyTypes[ key ] = 'Z10';
				} else if ( 'Z1K1' in value ) {
					keyTypes[ key ] = value.Z1K1;
				} else {
					keyTypes[ key ] = 'zobject';
				}
			} else {
				keyTypes[ key ] = 'Z6';
			}
		}

		// Set component state
		this.otherkeydata = otherkeydata;
		this.keyTypes = keyTypes;
	},
	mounted: function () {
		var solvedTypes = [],
			keyType,
			type;

		for ( keyType in this.keyTypes ) {
			type = keyType.match( /(Z\d+)/ )[ 1 ];

			// We fetch only the zids that
			// are not yet available in the state nor
			// are being fetched currently
			if (
				( !( type in this.zKeys ) ) &&
				( this.fetchingZKeys.indexOf( type ) === -1 ) &&
				( solvedTypes.indexOf( type ) === -1 )
			) {
				solvedTypes.push( type );
			}
		}

		// Call the store action to fetch the ZIds if there are any
		if ( solvedTypes.length > 0 ) {
			this.fetchZKeys( {
				zids: solvedTypes,
				zlangs: this.zLangs
			} );
		}
	}
};
</script>
