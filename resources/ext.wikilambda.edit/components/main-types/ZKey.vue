<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject-generic">
		<span>{{ z1k1label }}: </span>

		<span v-if="persistent">
			<a
				v-if="type !== zobjectId && ( viewmode || readonly )"
				:href="typeLink"
				:target="!viewmode ? '_blank' : ''"
			>
				<span>{{ typeLabel }}</span>
			</a>
			<span v-else>{{ typeLabel }}</span>
			<ul><li> {{ z2k1label }}: {{ z2K1Value }} </li></ul>
		</span>

		<span v-else>
			<span v-if="viewmode || readonly || type">
				<a :href="typeLink" :target="!viewmode ? '_blank' : ''">{{ typeLabel }}</a>
			</span>
			<wl-z-object-selector
				v-else
				:type="Constants.Z_TYPE"
				:return-type="Constants.Z_TYPE"
				:placeholder="$i18n( 'wikilambda-typeselector-label' ).text()"
				:selected-id="type"
				@input="onTypeChange"
			></wl-z-object-selector>
		</span>

		<wl-z-object-key-list
			:zobject-id="zobjectId"
			:readonly="readonly"
		></wl-z-object-key-list>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectGeneric = require( '../ZObjectGeneric.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-z-key',
	extends: ZObjectGeneric,
	computed: $.extend( {},
		mapGetters( [
			'getZObjectChildrenById',
			'getLatestObjectIndex',
			'getNestedZObjectById',
			'getCurrentZObjectId'
		] ),
		{
			zObject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zKeyValue: function () {
				return this.getCurrentZObjectId + 'K' + Number( this.zObjectParentIndex + 1 );
			},
			zObjectParentIndex: function () {
				return this.getLatestObjectIndex( this.getCurrentZObjectId );
			},
			zObjectKey: function () {
				return this.getNestedZObjectById( this.zobjectId, [ Constants.Z_KEY_ID ] );
			},
			zObjectKeyValue: function () {
				var object = this.getNestedZObjectById( this.zobjectId,
					[ Constants.Z_KEY_ID, Constants.Z_STRING_VALUE ] );

				return object ? object.value : '';
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'changeType' ] )
	)
};
</script>
