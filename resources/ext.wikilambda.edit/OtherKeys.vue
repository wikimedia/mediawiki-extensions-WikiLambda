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
			<span v-else-if="keyTypes[key] === 'Z6'">
				<span v-if="viewmode">{{ value }}</span>
				<input v-else
					class="ext-wikilambda-zstring"
					:value="value"
					@input="updateStringKey($event, key)"
				>
			</span>
			<select-zobject v-else-if="keyTypes[key] === 'Z9'"
				:search-text="zobject[key]"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></select-zobject>
			<list-value v-else-if="keyTypes[key] === 'Z10'"
				:list="zobject[key]"
				:viewmode="viewmode"
				@input="updateKey($event, key)"
			></list-value>
			<multi-lingual-string v-else-if="keyTypes[key] === 'Z12'"
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
var FullZobject = require( './FullZobject.vue' ),
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
		return {
			keylabel: ztypes.Z3,
			keyTypes: keyTypes,
			otherkeydata: otherkeydata,
			zkeylabels: zkeylabels,
			tooltipRemoveZObjectKey: this.$i18n( 'wikilambda-editor-zobject-removekey-tooltip' )
		};
	},
	methods: {
		addNewKey: function ( event ) {
			var key = event.target.value;
			// TODO: Only allow if the object doesn't have this key already set.
			this.$set( this.otherkeydata, key, '' );
			if ( !( key in this.zkeylabels ) ) {
				this.$set( this.zkeylabels, key, key );
			}
		},
		setKeyType: function ( newType, key ) {
			if ( newType === 'Z6' ) {
				this.$set( this.zobject, key, '' );
			} else if ( newType === 'Z10' ) {
				this.$set( this.zobject, key, [] );
			} else {
				this.$set( this.zobject, key, { Z1K1: newType } );
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
	}
};
</script>
