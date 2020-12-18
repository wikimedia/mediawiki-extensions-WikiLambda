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
			<span>{{ zkeylabels[key] }} ({{ key }}):</span>
			<type-selector v-if="!(key in keyTypes)"
				@change="setKeyType($event, key)"
			></type-selector>
			<span v-else-if="keyTypes[key] === Constants.Z_STRING">
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
			<select-zobject v-else-if="keyTypes[key] === Constants.Z_REFERENCE"
				:search-text="zobject[key]"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></select-zobject>
			<list-value v-else-if="keyTypes[key] === Constants.Z_LIST"
				:list="zobject[key]"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></list-value>
			<multi-lingual-string v-else-if="keyTypes[key] === Constants.Z_MULTILINGUALSTRING"
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
	TypeSelector = require( './TypeSelector.vue' ),
	SelectZobject = require( './SelectZobject.vue' ),
	ZMultiLingualString = require( './ZMultiLingualString.vue' );

module.exports = {
	name: 'OtherKeys',
	props: [ 'zobject', 'viewmode' ],
	data: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			ztypes = editingData.ztypes,
			zkeylabels = editingData.zkeylabels,
			otherkeydata = {},
			keyTypes = {},
			key,
			value;
		for ( key in this.zobject ) {
			if ( ( key.substring( 0, 3 ) === Constants.Z_OBJECT + 'K' ) || ( key === Constants.Z_PERSISTENTOBJECT_ID ) ) {
				continue;
			}
			value = this.zobject[ key ];
			otherkeydata[ key ] = value;
			if ( !( key in zkeylabels ) ) {
				zkeylabels[ key ] = key;
			}
			if ( typeof ( value ) === 'object' ) {
				if ( Array.isArray( value ) ) {
					keyTypes[ key ] = Constants.Z_LIST;
				} else if ( Constants.Z_OBJECT_TYPE in value ) {
					keyTypes[ key ] = value[ Constants.Z_OBJECT_TYPE ];
				} else {
					keyTypes[ key ] = 'zobject';
				}
			} else {
				keyTypes[ key ] = Constants.Z_STRING;
			}
		}
		return {
			Constants: Constants,
			zlang: editingData.zlang,
			keylabel: ztypes[ Constants.Z_KEY ],
			keyTypes: keyTypes,
			otherkeydata: otherkeydata,
			zkeylabels: zkeylabels,
			tooltipRemoveZObjectKey: this.$i18n( 'wikilambda-editor-zobject-removekey-tooltip' )
		};
	},
	methods: {
		addNewKey: function ( key ) {
			// TODO: Only allow if the object doesn't have this key already set.
			this.$set( this.otherkeydata, key, '' );
			if ( !( key in this.zkeylabels ) ) {
				this.$set( this.zkeylabels, key, key );
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
		'list-value': ListValue,
		'zkey-input': ZKey,
		'type-selector': TypeSelector,
		'select-zobject': SelectZobject,
		'multi-lingual-string': ZMultiLingualString
	},
	mounted: function () {
		var solvedTypes = [],
			keyType,
			type,
			api = new mw.Api(),
			zkeylabels = this.zkeylabels,
			zlang = this.zlang;
		for ( keyType in this.keyTypes ) {
			type = keyType.match( /(Z\d+)/ )[ 1 ];
			if ( solvedTypes.indexOf( type ) !== -1 ) {
				continue;
			}
			solvedTypes.push( type );
			( function ( zid ) {
				api.get( {
					action: 'wikilambda_fetch',
					format: 'json',
					zids: zid
				} ).done( function ( data ) {
					var keys = JSON.parse( data[ zid ].wikilambda_fetch )[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ];
					keys.forEach( function ( key ) {
						var labels = key[ Constants.Z_KEY_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ];
						labels.forEach( function ( label ) {
							if ( label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] === zlang ) {
								zkeylabels[ key[ Constants.Z_KEY_ID ] ] = label[ Constants.Z_MONOLINGUALSTRING_VALUE ];
								return;
							}
						} );
					} );
				} );
			}( type ) );
		}
	}
};
</script>
