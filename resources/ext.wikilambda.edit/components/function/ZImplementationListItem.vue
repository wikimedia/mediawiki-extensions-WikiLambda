<template>
	<!--
		WikiLambda Vue component for ZObject references to ZImplementations in ZLists.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<li class="ext-wikilambda-ZImplementationListItem">
		<sd-button v-if="!(getViewMode || readonly)"
			class="z-list-item-remove"
			:destructive="true"
			:title="tooltipRemoveListItem"
			@click="$emit('remove-item', zobjectId )"
		>
			{{ $i18n( 'wikilambda-editor-removeitem' ) }}
		</sd-button>
		<select v-if="!hasReference" @change="selectImplementation">
			<option disabled selected>
				{{ $i18n( "wikilambda-implementation-selector" ) }}
			</option>
			<option
				v-for="zImplementationId in getUnattachedZImplementations"
				:key="zImplementationId"
				:value="zImplementationId"
			>
				{{ getZkeyLabels[ zImplementationId ] }}
			</option>
		</select>
		<h4 class="ext-wikilambda-inline-list-item-title">
			<a :href="zImplementationLink">
				{{ zImplementationLabel }}
			</a>
		</h4>
		<code-editor
			v-if="zImplementation &&
				!zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_BUILT_IN ]"
			:mode="zImplementationCodeLanguage"
			:read-only="true"
			:value="zImplementationCode"
			class="ext-wikilambda-zcode"
		></code-editor>
	</li>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZListItem = require( '../types/ZListItem.vue' ),
	ZReference = require( '../types/ZReference.vue' ),
	CodeEditor = require( '../base/CodeEditor.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'ZImplementationListItem',
	extends: ZListItem,
	components: {
		'z-reference': ZReference,
		'code-editor': CodeEditor
	},
	computed: $.extend( mapGetters( [
		'getZObjectById',
		'getUnattachedZImplementations',
		'getZkeyLabels',
		'getZkeys',
		'getViewMode'
	] ),
	{
		zImplementationId: function () {
			return this.findKeyInArray( Constants.Z_REFERENCE_ID, this.zobject ).value;
		},
		hasReference: function () {
			return !!this.zImplementationId;
		},
		zImplementationLabel: function () {
			return this.getZkeyLabels[ this.zImplementationId ];
		},
		zImplementation: function () {
			return this.getZkeys[ this.zImplementationId ];
		},
		zImplementationCodeLanguage: function () {
			if ( !this.zImplementation ) {
				return '';
			}

			if ( !this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_CODE ]
			) {
				return 'json';
			}

			return this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_CODE ][
				Constants.Z_CODE_LANGUAGE ][
				Constants.Z_PROGRAMMING_LANGUAGE_CODE ];
		},
		zImplementationCode: function () {
			if ( !this.zImplementation ) {
				return '';
			}

			if ( this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_COMPOSITION ]
			) {
				var composition = JSON.parse(
					JSON.stringify(
						this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
							Constants.Z_IMPLEMENTATION_COMPOSITION ]
					)
				);
				this.fetchZKeys( this.findMissingZids( composition ) );

				return JSON.stringify( composition, null, 4 );
			}

			return this.zImplementation[ Constants.Z_PERSISTENTOBJECT_VALUE ][
				Constants.Z_IMPLEMENTATION_CODE ][
				Constants.Z_CODE_CODE ];
		},
		zImplementationLink: function () {
			return '/wiki/' + this.zImplementationId;
		}
	}
	),
	methods: $.extend( mapActions( [ 'fetchZKeys', 'removeGenericTypeItem' ] ), {
		selectImplementation: function ( event ) {
			this.$store.dispatch( 'injectZObject', {
				zobject: {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: event.target.value
				},
				key: Constants.Z_IMPLEMENTATION_FUNCTION,
				id: this.zobjectId,
				parent: this.getZObjectById( this.zobjectId ).parent
			} );
		},
		findMissingZids: function ( zobject ) {
			var zids = [],
				zIdRegex = new RegExp( /Z[1-9]\d*/ );

			for ( var key in zobject ) {
				if ( zIdRegex.test( key ) ) {
					zids.push( key );
				}

				if ( Array.isArray( zobject[ key ] ) ) {
					zids = zids.concat( zobject[ key ].map( this.findMissingZids ) );
				} else if ( typeof zobject[ key ] === 'object' ) {
					zids = zids.concat( this.findMissingZids( zobject[ key ] ) );
				} else {
					if ( zIdRegex.test( zobject[ key ] ) ) {
						zids.push( zobject[ key ] );
					}
				}
			}

			return zids;
		},
		removeItem: function () {

			var item = this.getZObjectById( this.zobjectId );
			this.removeGenericTypeItem( item );

		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-ZImplementationListItem {
	margin-top: 1em;
	margin-bottom: 1em;

	.ext-wikilambda-zcode {
		margin-top: 0.5em;
	}

	.ext-wikilambda-inline-list-item-title {
		display: inline;
	}
}
</style>
